import path from "path";
import { getClientScript } from "./client.js";
import {
  COLOR_PALETTE,
  resolveOptions,
  generateId,
  ensureOutputFile,
  writeData,
  readData,
  countTotalClicks,
  validateClickData,
} from "./store.js";

/**
 * Connect-style middleware that handles the /__see-my-clicks endpoint.
 */
export function createMiddleware(opts = {}) {
  const { outputFile: relPath } = resolveOptions(opts);
  const outputFile = path.resolve(process.cwd(), relPath);

  ensureOutputFile(outputFile);

  // Serialize all read-modify-write file operations to prevent concurrent
  // requests from clobbering each other (e.g. two rapid Alt+Clicks).
  let writeQueue = Promise.resolve();

  const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

  function sendJson(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  function collectBody(req, res, cb) {
    let body = "";
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      if (body.length + chunk.length > MAX_BODY_SIZE) {
        rejected = true;
        sendJson(res, 413, { error: "Request body too large" });
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on("end", () => {
      if (rejected) return;
      writeQueue = writeQueue.then(() => cb(body));
    });
  }

  function handlePost(req, res) {
    collectBody(req, res, (body) => {
      try {
        const { data, newSession, sessionName } = JSON.parse(body);

        if (!validateClickData(data)) {
          sendJson(res, 400, {
            error: "Invalid click data: clickId and tagName required",
          });
          return;
        }

        const store = readData(outputFile);

        // Auto-start a new session if clicks were retrieved since the last one started
        const lastSession = store.sessions[store.sessions.length - 1];
        const retrieved = store.lastRetrievedAt;
        const autoNew =
          retrieved && lastSession && lastSession.startedAt <= retrieved;

        if (newSession || autoNew || store.sessions.length === 0) {
          const name = sessionName || "Session " + (store.sessions.length + 1);
          store.sessions.push({
            id: generateId(),
            name: name,
            color: COLOR_PALETTE[store.sessions.length % COLOR_PALETTE.length],
            startedAt: new Date().toISOString(),
            clicks: [data],
          });
        } else {
          const active = store.sessions[store.sessions.length - 1];
          active.clicks.push(data);
        }

        writeData(outputFile, store);

        const active = store.sessions[store.sessions.length - 1];
        console.log(
          `[see-my-clicks] ${newSession ? "New session" : "Added"}: <${data.tagName}> in "${active.name}" (${active.clicks.length} clicks, ${countTotalClicks(store)} total)`,
        );

        sendJson(res, 200, {
          success: true,
          sessionId: active.id,
          sessionName: active.name,
          sessionColor: active.color || COLOR_PALETTE[0],
          totalClicks: countTotalClicks(store),
        });
      } catch (err) {
        console.error("[see-my-clicks] POST error:", err);
        sendJson(res, 500, { error: String(err) });
      }
    });
  }

  function handleGet(res, url) {
    writeQueue = writeQueue.then(() => {
      try {
        const store = readData(outputFile);
        const isExternalRead = url.searchParams.get("source") !== "browser";
        if (isExternalRead) {
          store.lastRetrievedAt = new Date().toISOString();
          writeData(outputFile, store);
        }
        sendJson(res, 200, store);
      } catch (err) {
        console.error("[see-my-clicks] GET error:", err);
        sendJson(res, 500, { error: String(err) });
      }
    });
  }

  function handleDelete(res, url) {
    writeQueue = writeQueue.then(() => {
      try {
        const clickId = url.searchParams.get("clickId");
        const store = readData(outputFile);

        if (clickId) {
          for (const session of store.sessions) {
            session.clicks = session.clicks.filter(
              (c) => c.clickId !== clickId,
            );
          }
          store.sessions = store.sessions.filter((s) => s.clicks.length > 0);
          writeData(outputFile, store);
          sendJson(res, 200, {
            success: true,
            totalClicks: countTotalClicks(store),
            sessions: store.sessions,
          });
        } else {
          writeData(outputFile, { sessions: [], lastRetrievedAt: null });
          sendJson(res, 200, { success: true, totalClicks: 0 });
        }
      } catch (err) {
        console.error("[see-my-clicks] DELETE error:", err);
        sendJson(res, 500, { error: String(err) });
      }
    });
  }

  function updateSessionColor(res, parsed) {
    const store = readData(outputFile);
    let found = false;
    for (const session of store.sessions) {
      if (session.id === parsed.sessionId) {
        session.color = parsed.color;
        found = true;
        break;
      }
    }
    if (!found) {
      sendJson(res, 404, { error: "Session not found" });
      return;
    }
    writeData(outputFile, store);
    sendJson(res, 200, { success: true });
  }

  function updateClickComment(res, parsed) {
    const { clickId, comment } = parsed;
    if (!clickId) {
      sendJson(res, 400, { error: "clickId required" });
      return;
    }
    const store = readData(outputFile);
    let found = false;
    for (const session of store.sessions) {
      for (const click of session.clicks) {
        if (click.clickId === clickId) {
          click.comment = comment || null;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      sendJson(res, 404, { error: "Click not found" });
      return;
    }
    writeData(outputFile, store);
    sendJson(res, 200, { success: true });
  }

  function handlePut(req, res) {
    collectBody(req, res, (body) => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.resetRead) {
          const store = readData(outputFile);
          store.lastRetrievedAt = null;
          writeData(outputFile, store);
          sendJson(res, 200, { success: true });
        } else if (parsed.sessionId && parsed.color && !parsed.clickId) {
          updateSessionColor(res, parsed);
        } else {
          updateClickComment(res, parsed);
        }
      } catch (err) {
        console.error("[see-my-clicks] PUT error:", err);
        sendJson(res, 500, { error: String(err) });
      }
    });
  }

  return function seeMyClicksMiddleware(req, res, next) {
    const url = new URL(req.url, "http://localhost");

    // Support both mounted (prefix stripped) and unmounted (full path) usage
    const pathname = url.pathname.startsWith("/__see-my-clicks")
      ? url.pathname.replace("/__see-my-clicks", "") || "/"
      : url.pathname;

    if (pathname !== "/" && pathname !== "/client.js") {
      return next?.();
    }

    if (req.method === "GET" && pathname === "/client.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(getClientScript());
      return;
    }

    if (req.method === "POST") handlePost(req, res);
    else if (req.method === "GET") handleGet(res, url);
    else if (req.method === "DELETE") handleDelete(res, url);
    else if (req.method === "PUT") handlePut(req, res);
    else {
      res.writeHead(405);
      res.end();
    }
  };
}
