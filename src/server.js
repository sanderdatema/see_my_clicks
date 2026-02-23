import fs from "fs";
import path from "path";
import { getClientScript } from "./client.js";

// Keep in sync with SESSION_COLORS in src/client-source.js
const COLOR_PALETTE = [
  "#8b5cf6",
  "#f38ba8",
  "#fab387",
  "#f9e2af",
  "#a6e3a1",
  "#89dceb",
  "#74c7ec",
  "#cba6f7",
];

const DEFAULTS = {
  maxEntries: 10,
  expiryMinutes: 60,
  outputFile: ".see-my-clicks/clicked.json",
};

function resolveOptions(opts = {}) {
  return { ...DEFAULTS, ...opts };
}

// Keep in sync with ID generation in src/client-source.js (captureElement)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function ensureOutputFile(outputFile) {
  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, JSON.stringify({ sessions: [] }));
  }
}

function writeData(outputFile, data) {
  const tmp = `${outputFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, outputFile);
}

function readData(outputFile) {
  if (!fs.existsSync(outputFile)) return { sessions: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    // Migration: old flat array format → wrap in a session
    if (Array.isArray(raw)) {
      if (raw.length === 0) return { sessions: [] };
      return {
        sessions: [
          {
            id: generateId(),
            name: "Migrated Session",
            startedAt: raw[0]?.timestamp || new Date().toISOString(),
            clicks: raw,
          },
        ],
      };
    }
    return raw && raw.sessions ? raw : { sessions: [] };
  } catch {
    return { sessions: [] };
  }
}

function filterExpiredSessions(store, expiryMs) {
  const now = Date.now();
  for (const session of store.sessions) {
    session.clicks = session.clicks.filter(
      (c) => now - new Date(c.timestamp).getTime() < expiryMs,
    );
  }
  store.sessions = store.sessions.filter((s) => s.clicks.length > 0);
  return store;
}

function countTotalClicks(store) {
  let total = 0;
  for (const session of store.sessions) {
    total += session.clicks.length;
  }
  return total;
}

function validateClickData(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.clickId || typeof data.clickId !== "string") return false;
  if (!data.tagName || typeof data.tagName !== "string") return false;
  return true;
}

/**
 * Connect-style middleware that handles the /__see-my-clicks endpoint.
 */
export function createMiddleware(opts = {}) {
  const {
    maxEntries,
    expiryMinutes,
    outputFile: relPath,
  } = resolveOptions(opts);
  const outputFile = path.resolve(process.cwd(), relPath);
  const expiryMs = expiryMinutes * 60 * 1000;

  ensureOutputFile(outputFile);

  // Serialize all read-modify-write file operations to prevent concurrent
  // requests from clobbering each other (e.g. two rapid Alt+Clicks).
  let writeQueue = Promise.resolve();

  function sendJson(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  function collectBody(req, cb) {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      writeQueue = writeQueue.then(() => cb(body));
    });
  }

  function handlePost(req, res) {
    collectBody(req, (body) => {
      try {
        const { data, newSession, sessionName } = JSON.parse(body);

        if (!validateClickData(data)) {
          sendJson(res, 400, {
            error: "Invalid click data: clickId and tagName required",
          });
          return;
        }

        const store = filterExpiredSessions(readData(outputFile), expiryMs);

        if (newSession || store.sessions.length === 0) {
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
          if (active.clicks.length > maxEntries) {
            active.clicks = active.clicks.slice(-maxEntries);
          }
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
        const store = filterExpiredSessions(readData(outputFile), expiryMs);
        const clear = url.searchParams.get("clear") === "true";

        // Persist filtered result; only clear data when explicitly requested
        writeData(outputFile, clear ? { sessions: [] } : store);

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
        const store = filterExpiredSessions(readData(outputFile), expiryMs);

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
          writeData(outputFile, { sessions: [] });
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
    collectBody(req, (body) => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.sessionId && parsed.color && !parsed.clickId) {
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
