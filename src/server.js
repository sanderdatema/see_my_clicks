import fs from "fs";
import path from "path";

const DEFAULTS = {
  maxEntries: 10,
  expiryMinutes: 60,
  outputFile: ".see-my-clicks/clicked.json",
};

function resolveOptions(opts = {}) {
  return { ...DEFAULTS, ...opts };
}

function ensureOutputFile(outputFile) {
  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, "[]");
  }
}

function filterExpired(clicks, expiryMs) {
  const now = Date.now();
  return clicks.filter((c) => now - new Date(c.timestamp).getTime() < expiryMs);
}

function readClicks(outputFile, expiryMs) {
  if (!fs.existsSync(outputFile)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    const clicks = Array.isArray(raw) ? raw : [raw];
    return filterExpired(clicks, expiryMs);
  } catch {
    return [];
  }
}

function writeClicks(outputFile, clicks) {
  const tmp = `${outputFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clicks, null, 2));
  fs.renameSync(tmp, outputFile);
}

/**
 * Connect-style middleware that handles the /__see-my-clicks endpoint.
 */
export function createMiddleware(opts = {}) {
  const { maxEntries, expiryMinutes, outputFile: relPath } = resolveOptions(opts);
  const outputFile = path.resolve(process.cwd(), relPath);
  const expiryMs = expiryMinutes * 60 * 1000;

  ensureOutputFile(outputFile);

  return function seeMyClicksMiddleware(req, res, next) {
    const url = new URL(req.url, "http://localhost");

    if (!url.pathname.startsWith("/__see-my-clicks")) {
      return next?.();
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          const { data, clear } = JSON.parse(body);
          let clicks = clear ? [] : readClicks(outputFile, expiryMs);
          clicks.push(data);
          if (clicks.length > maxEntries) {
            clicks = clicks.slice(-maxEntries);
          }
          writeClicks(outputFile, clicks);
          console.log(
            `[see-my-clicks] ${clear ? "Cleared and saved" : "Added"} click on <${data.tagName}> (${clicks.length} total)`,
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, count: clicks.length }));
        } catch (err) {
          console.error("[see-my-clicks] POST error:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    } else if (req.method === "GET") {
      try {
        const clicks = readClicks(outputFile, expiryMs);
        const keep = url.searchParams.get("keep") === "true";
        const ids = url.searchParams.get("ids")?.split(",").filter(Boolean) || [];

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(clicks));

        if (ids.length > 0) {
          writeClicks(outputFile, clicks.filter((c) => !ids.includes(c.clickId)));
        } else if (!keep) {
          writeClicks(outputFile, []);
        }
      } catch (err) {
        console.error("[see-my-clicks] GET error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (req.method === "DELETE") {
      writeClicks(outputFile, []);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(405);
      res.end();
    }
  };
}
