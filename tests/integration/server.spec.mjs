import { expect, test } from "@playwright/test";
import fs from "fs";
import os from "os";
import path from "path";

import { createMiddleware } from "../../src/server.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock IncomingMessage. If body is provided it is serialised as JSON
 * and emitted via data/end events on the next tick, simulating a real Node.js
 * request stream.
 */
function mockReq(method, url, body = null, headers = {}) {
  const listeners = {};
  const req = {
    method,
    url,
    headers,
    on(event, fn) {
      listeners[event] = fn;
    },
    destroy() {
      this.destroyed = true;
    },
    destroyed: false,
  };

  if (body !== null) {
    setTimeout(() => {
      if (listeners.data) listeners.data(Buffer.from(JSON.stringify(body)));
      if (listeners.end) listeners.end();
    }, 0);
  } else {
    setTimeout(() => {
      if (listeners.end) listeners.end();
    }, 0);
  }

  return req;
}

/**
 * Create a mock ServerResponse that resolves the returned promise when
 * res.end() is called, so tests can simply `await send(req)`.
 */
function mockRes() {
  let _status, _headers, _body;
  let _resolve;
  const done = new Promise((resolve) => {
    _resolve = resolve;
  });

  const res = {
    writeHead(s, h) {
      _status = s;
      _headers = h;
    },
    end(b) {
      _body = b;
      _resolve();
    },
    get status() {
      return _status;
    },
    get body() {
      return _body ? JSON.parse(_body) : null;
    },
    get headers() {
      return _headers;
    },
    get done() {
      return done;
    },
  };

  return res;
}

/**
 * Send a request through the middleware and wait for the response.
 */
async function send(middleware, method, url, body = null, headers = {}) {
  const req = mockReq(method, url, body, headers);
  const res = mockRes();
  middleware(req, res, () => {});
  await res.done;
  return res;
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let middleware;
let tmpDir;
let outputFile;

test.beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-server-"));
  outputFile = path.join(tmpDir, "clicked.json");
  middleware = createMiddleware({ outputFile });
});

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

test("CSRF: rejects POST with non-localhost origin (403)", async () => {
  const res = await send(
    middleware,
    "POST",
    "/__see-my-clicks",
    { data: { clickId: "c1", tagName: "div" } },
    { origin: "https://evil.example.com" }
  );

  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/cross-origin/i);
});

test("CSRF: allows POST with localhost origin", async () => {
  const res = await send(
    middleware,
    "POST",
    "/__see-my-clicks",
    { data: { clickId: "c1", tagName: "div" } },
    { origin: "http://localhost:3000" }
  );

  expect(res.status).toBe(200);
});

test("CSRF: allows POST without an origin header", async () => {
  const res = await send(
    middleware,
    "POST",
    "/__see-my-clicks",
    { data: { clickId: "c1", tagName: "div" } }
    // no headers
  );

  expect(res.status).toBe(200);
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

test("POST: creates a new session on an empty store", async () => {
  const res = await send(middleware, "POST", "/__see-my-clicks", {
    data: { clickId: "c1", tagName: "button" },
  });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(typeof res.body.sessionId).toBe("string");
  expect(res.body.totalClicks).toBe(1);
});

test("POST: returns 400 for invalid click data", async () => {
  const res = await send(middleware, "POST", "/__see-my-clicks", {
    data: { tagName: "div" }, // missing clickId
  });

  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/clickId/i);
});

test("POST: returns 413 for oversized body", async () => {
  // Build a body larger than 1 MB
  const listeners = {};
  const req = {
    method: "POST",
    url: "/__see-my-clicks",
    headers: {},
    on(event, fn) {
      listeners[event] = fn;
    },
    destroy() {
      this.destroyed = true;
    },
    destroyed: false,
  };

  const res = mockRes();
  middleware(req, res, () => {});

  // Emit a chunk that exceeds MAX_BODY_SIZE (1 MB)
  setTimeout(() => {
    if (listeners.data) listeners.data(Buffer.alloc(1024 * 1024 + 1, "x"));
    if (listeners.end) listeners.end();
  }, 0);

  await res.done;

  expect(res.status).toBe(413);
  expect(res.body.error).toMatch(/too large/i);
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

test("GET: returns store contents", async () => {
  // Seed a click first
  await send(middleware, "POST", "/__see-my-clicks", {
    data: { clickId: "c1", tagName: "div" },
  });

  const res = await send(
    middleware,
    "GET",
    "/__see-my-clicks?source=browser"
  );

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.sessions)).toBe(true);
  expect(res.body.sessions.length).toBeGreaterThan(0);
});

test("GET: sets lastRetrievedAt for external (non-browser) reads", async () => {
  // Non-browser GET (no source=browser param)
  const res = await send(middleware, "GET", "/__see-my-clicks");

  expect(res.status).toBe(200);

  // The file on disk should now have lastRetrievedAt set
  const stored = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  expect(typeof stored.lastRetrievedAt).toBe("string");
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

test("DELETE: deletes a specific click by clickId", async () => {
  // Seed two clicks
  await send(middleware, "POST", "/__see-my-clicks", {
    data: { clickId: "c1", tagName: "div" },
  });
  await send(middleware, "POST", "/__see-my-clicks", {
    data: { clickId: "c2", tagName: "span" },
  });

  const res = await send(
    middleware,
    "DELETE",
    "/__see-my-clicks?clickId=c1"
  );

  expect(res.status).toBe(200);
  expect(res.body.totalClicks).toBe(1);

  // Verify c1 is gone from the file
  const stored = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  const allClickIds = stored.sessions.flatMap((s) =>
    s.clicks.map((c) => c.clickId)
  );
  expect(allClickIds).not.toContain("c1");
  expect(allClickIds).toContain("c2");
});

test("DELETE: purges all data when no clickId is provided", async () => {
  // Seed a click
  await send(middleware, "POST", "/__see-my-clicks", {
    data: { clickId: "c1", tagName: "div" },
  });

  const res = await send(middleware, "DELETE", "/__see-my-clicks");

  expect(res.status).toBe(200);
  expect(res.body.totalClicks).toBe(0);

  const stored = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  expect(stored.sessions).toEqual([]);
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

test("PUT update-comment: updates a comment on an existing click", async () => {
  // Seed a click
  await send(middleware, "POST", "/__see-my-clicks", {
    data: { clickId: "c1", tagName: "div" },
  });

  const res = await send(middleware, "PUT", "/__see-my-clicks", {
    action: "update-comment",
    clickId: "c1",
    comment: "This is a test comment",
  });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);

  // Verify on disk
  const stored = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  const click = stored.sessions.flatMap((s) => s.clicks).find((c) => c.clickId === "c1");
  expect(click.comment).toBe("This is a test comment");
});

test("PUT update-color: rejects an invalid hex color", async () => {
  // Seed a click to get a session created
  await send(middleware, "POST", "/__see-my-clicks", {
    data: { clickId: "c1", tagName: "div" },
  });

  const stored = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  const sessionId = stored.sessions[0].id;

  const res = await send(middleware, "PUT", "/__see-my-clicks", {
    action: "update-color",
    sessionId,
    color: "not-a-color",
  });

  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/invalid color/i);
});

test("PUT reset-read: clears lastRetrievedAt", async () => {
  // First trigger a GET to set lastRetrievedAt
  await send(middleware, "GET", "/__see-my-clicks");

  // Confirm it is set
  const before = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  expect(typeof before.lastRetrievedAt).toBe("string");

  // Now reset it
  const res = await send(middleware, "PUT", "/__see-my-clicks", {
    action: "reset-read",
  });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);

  const after = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  expect(after.lastRetrievedAt).toBeNull();
});
