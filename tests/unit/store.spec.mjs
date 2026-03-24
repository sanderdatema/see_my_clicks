import { expect, test } from "@playwright/test";
import fs from "fs";
import os from "os";
import path from "path";

import {
  validateClickData,
  readData,
  writeData,
  countTotalClicks,
  generateId,
  resolveOptions,
  DEFAULTS,
} from "../../src/store.js";

// ---------------------------------------------------------------------------
// validateClickData
// ---------------------------------------------------------------------------

test("validateClickData returns true for valid click data", () => {
  expect(validateClickData({ clickId: "abc", tagName: "div" })).toBe(true);
});

test("validateClickData returns false for null", () => {
  expect(validateClickData(null)).toBe(false);
});

test("validateClickData returns false for undefined", () => {
  expect(validateClickData(undefined)).toBe(false);
});

test("validateClickData returns false for non-object (string)", () => {
  expect(validateClickData("abc")).toBe(false);
});

test("validateClickData returns false when clickId is missing", () => {
  expect(validateClickData({ tagName: "div" })).toBe(false);
});

test("validateClickData returns false when tagName is missing", () => {
  expect(validateClickData({ clickId: "abc" })).toBe(false);
});

test("validateClickData returns false when clickId is not a string", () => {
  expect(validateClickData({ clickId: 123, tagName: "div" })).toBe(false);
});

test("validateClickData returns false when tagName is not a string", () => {
  expect(validateClickData({ clickId: "abc", tagName: 42 })).toBe(false);
});

// ---------------------------------------------------------------------------
// readData
// ---------------------------------------------------------------------------

test("readData returns { sessions: [] } when file does not exist", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");

  const data = readData(file);

  expect(data).toEqual({ sessions: [] });
});

test("readData returns { sessions: [] } when file contains corrupt JSON and creates .corrupt backup", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");
  fs.writeFileSync(file, "not valid { json [");

  const data = readData(file);

  expect(data).toEqual({ sessions: [] });

  // Backup should exist
  const backups = fs.readdirSync(dir).filter((f) => f.includes(".corrupt."));
  expect(backups.length).toBe(1);
});

test("readData migrates legacy flat array to session format", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");
  const legacyClicks = [
    { clickId: "c1", tagName: "button", timestamp: "2024-01-01T00:00:00Z" },
    { clickId: "c2", tagName: "a", timestamp: "2024-01-01T00:01:00Z" },
  ];
  fs.writeFileSync(file, JSON.stringify(legacyClicks));

  const data = readData(file);

  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0].name).toBe("Migrated Session");
  expect(data.sessions[0].clicks).toEqual(legacyClicks);
});

test("readData migrates empty legacy flat array to { sessions: [] }", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");
  fs.writeFileSync(file, JSON.stringify([]));

  const data = readData(file);

  expect(data).toEqual({ sessions: [] });
});

test("readData returns parsed data for valid store format", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");
  const store = {
    sessions: [
      {
        id: "s1",
        name: "Session 1",
        startedAt: "2024-01-01T00:00:00Z",
        clicks: [{ clickId: "c1", tagName: "div" }],
      },
    ],
  };
  fs.writeFileSync(file, JSON.stringify(store));

  const data = readData(file);

  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0].id).toBe("s1");
  expect(data.sessions[0].clicks).toHaveLength(1);
});

test("readData preserves lastRetrievedAt field", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");
  const ts = "2024-06-01T12:00:00.000Z";
  const store = { sessions: [], lastRetrievedAt: ts };
  fs.writeFileSync(file, JSON.stringify(store));

  const data = readData(file);

  expect(data.lastRetrievedAt).toBe(ts);
});

// ---------------------------------------------------------------------------
// writeData
// ---------------------------------------------------------------------------

test("writeData creates a file with JSON content", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");
  const store = { sessions: [] };

  writeData(file, store);

  const written = JSON.parse(fs.readFileSync(file, "utf-8"));
  expect(written).toEqual(store);
});

test("writeData overwrites existing file atomically (no .tmp file left behind)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smc-"));
  const file = path.join(dir, "clicked.json");
  const first = { sessions: [], note: "original" };
  const second = { sessions: [], note: "updated" };

  writeData(file, first);
  writeData(file, second);

  const written = JSON.parse(fs.readFileSync(file, "utf-8"));
  expect(written.note).toBe("updated");

  // No stale .tmp should remain
  expect(fs.existsSync(file + ".tmp")).toBe(false);
});

// ---------------------------------------------------------------------------
// countTotalClicks
// ---------------------------------------------------------------------------

test("countTotalClicks returns 0 for empty sessions", () => {
  expect(countTotalClicks({ sessions: [] })).toBe(0);
});

test("countTotalClicks sums clicks across multiple sessions", () => {
  const store = {
    sessions: [
      { clicks: [{ clickId: "c1", tagName: "div" }, { clickId: "c2", tagName: "p" }] },
      { clicks: [{ clickId: "c3", tagName: "a" }] },
    ],
  };
  expect(countTotalClicks(store)).toBe(3);
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

test("generateId returns a string", () => {
  expect(typeof generateId()).toBe("string");
});

test("generateId returns unique values", () => {
  const ids = new Set(Array.from({ length: 50 }, () => generateId()));
  expect(ids.size).toBe(50);
});

// ---------------------------------------------------------------------------
// resolveOptions
// ---------------------------------------------------------------------------

test("resolveOptions returns default outputFile when called with no arguments", () => {
  const opts = resolveOptions();
  expect(opts.outputFile).toBe(DEFAULTS.outputFile);
});

test("resolveOptions merges provided opts over defaults", () => {
  const opts = resolveOptions({ outputFile: "custom/output.json" });
  expect(opts.outputFile).toBe("custom/output.json");
});
