import fs from "fs";
import path from "path";
import { getClientScript } from "./client.js";

const DEFAULTS = {
  maxEntries: 10,
  expiryMinutes: 60,
  outputFile: ".see-my-clicks/clicked.json",
};

function resolveOptions(opts = {}) {
  return { ...DEFAULTS, ...opts };
}

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

  return function seeMyClicksMiddleware(req, res, next) {
    const url = new URL(req.url, "http://localhost");

    if (!url.pathname.startsWith("/__see-my-clicks")) {
      return next?.();
    }

    // Serve the client script
    if (req.method === "GET" && url.pathname === "/__see-my-clicks/client.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(getClientScript());
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          const { data, newSession, sessionName } = JSON.parse(body);

          if (!validateClickData(data)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Invalid click data: clickId and tagName required",
              }),
            );
            return;
          }

          const store = filterExpiredSessions(readData(outputFile), expiryMs);

          if (newSession || store.sessions.length === 0) {
            // Create a new session
            const name =
              sessionName || "Session " + (store.sessions.length + 1);
            store.sessions.push({
              id: generateId(),
              name: name,
              startedAt: new Date().toISOString(),
              clicks: [data],
            });
          } else {
            // Add to the active (last) session
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

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              sessionId: active.id,
              sessionName: active.name,
              clickCount: active.clicks.length,
              totalClicks: countTotalClicks(store),
            }),
          );
        } catch (err) {
          console.error("[see-my-clicks] POST error:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    } else if (req.method === "GET") {
      try {
        const store = filterExpiredSessions(readData(outputFile), expiryMs);
        const keep = url.searchParams.get("keep") === "true";

        // Always persist the filtered result to prune expired entries
        writeData(outputFile, keep ? store : { sessions: [] });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(store));
      } catch (err) {
        console.error("[see-my-clicks] GET error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (req.method === "DELETE") {
      try {
        const clickId = url.searchParams.get("clickId");
        const store = filterExpiredSessions(readData(outputFile), expiryMs);

        if (clickId) {
          // Remove a specific click
          for (const session of store.sessions) {
            session.clicks = session.clicks.filter(
              (c) => c.clickId !== clickId,
            );
          }
          // Remove empty sessions
          store.sessions = store.sessions.filter((s) => s.clicks.length > 0);
          writeData(outputFile, store);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              totalClicks: countTotalClicks(store),
              sessions: store.sessions,
            }),
          );
        } else {
          // Clear everything
          writeData(outputFile, { sessions: [] });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, totalClicks: 0 }));
        }
      } catch (err) {
        console.error("[see-my-clicks] DELETE error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else {
      res.writeHead(405);
      res.end();
    }
  };
}
