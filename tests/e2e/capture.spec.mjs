import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const DATA_FILE = path.resolve(".see-my-clicks/e2e-test.json");

/** Reset the data file to empty state (don't delete the dir — server needs it). */
function resetDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ sessions: [] }));
}

test.beforeEach(async () => {
  resetDataFile();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Alt+Click on an element. */
async function altClick(page, selector) {
  await page.click(selector, { modifiers: ["Alt"] });
}

/** Wait for the comment modal to appear. */
async function waitForModal(page) {
  await expect(page.locator("#__smc-modal")).toBeVisible({ timeout: 3000 });
}

/** Click "Skip" in the comment modal. */
async function skipModal(page) {
  await page.click("#__smc-skip");
  await expect(page.locator("#__smc-modal")).toBeHidden();
}

/** Wait until the data file contains at least one click. */
async function waitForDataFile() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (data.sessions?.length > 0 && data.sessions[0].clicks?.length > 0) {
        return data;
      }
    } catch {
      // file might be mid-write
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Data file not written within timeout");
}

/** Read the persisted JSON data file. */
function readDataFile() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Click capture", () => {
  test("Alt+Click shows the comment modal", async ({ page }) => {
    await page.goto("/");
    await altClick(page, "#btn-primary");
    await waitForModal(page);

    const header = page.locator("#__smc-header-text");
    await expect(header).toContainText("<button>");
  });

  test("Skip saves capture without comment", async ({ page }) => {
    await page.goto("/");
    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);

    const data = await waitForDataFile();
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].clicks).toHaveLength(1);

    const click = data.sessions[0].clicks[0];
    expect(click.tagName).toBe("button");
    expect(click.clickId).toBeTruthy();
    expect(click.comment).toBeNull();
  });

  test("Save persists comment text", async ({ page }) => {
    await page.goto("/");
    await altClick(page, "#btn-primary");
    await waitForModal(page);

    await page.fill("#__smc-input", "Fix this button");
    await page.click("#__smc-save");

    const data = await waitForDataFile();
    expect(data.sessions[0].clicks[0].comment).toBe("Fix this button");
  });

  test("Multiple captures go to the same session", async ({ page }) => {
    await page.goto("/");

    // First capture
    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);

    // Wait for first write to complete
    await waitForDataFile();

    // Second capture
    await altClick(page, "#heading");
    await waitForModal(page);
    await skipModal(page);

    // Wait until 2 clicks are in the file
    await expect(async () => {
      const data = readDataFile();
      expect(data.sessions[0].clicks).toHaveLength(2);
    }).toPass({ timeout: 5000 });

    const data = readDataFile();
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].clicks[0].tagName).toBe("button");
    expect(data.sessions[0].clicks[1].tagName).toBe("h1");
  });

  test("Captures element attributes", async ({ page }) => {
    await page.goto("/");
    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);

    const data = await waitForDataFile();
    const click = data.sessions[0].clicks[0];
    expect(click.elementId).toBe("btn-primary");
    expect(click.classList).toContain("target");
  });
});

test.describe("Badge", () => {
  test("Badge is visible on page load", async ({ page }) => {
    await page.goto("/");

    const badge = page.locator("#__smc-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("aria-label", /See my clicks/);
  });

  test("Badge shows unread count after capture", async ({ page }) => {
    await page.goto("/");

    const badge = page.locator("#__smc-badge");

    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);

    await expect(badge).toHaveAttribute(
      "aria-label",
      "See my clicks: 1 unread capture",
    );
  });
});

test.describe("Panel", () => {
  test("Panel opens on badge click and shows captures", async ({ page }) => {
    await page.goto("/");

    // Capture something first
    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);

    // Click the badge to open the panel
    await page.click("#__smc-badge");
    const panel = page.locator("#__smc-panel");
    await expect(panel).toBeVisible();

    // Panel should contain the captured element info
    await expect(panel).toContainText("button");
  });
});

test.describe("Markers", () => {
  test("Marker appears on captured element", async ({ page }) => {
    await page.goto("/");

    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);

    const markers = page.locator("#__smc-markers .__smc-marker");
    await expect(markers).toHaveCount(1);
  });
});

test.describe("API endpoints", () => {
  test("GET returns the store data", async ({ page }) => {
    await page.goto("/");

    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);

    // Wait for data to be persisted
    await waitForDataFile();

    const response = await page.request.get("/__see-my-clicks");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].clicks).toHaveLength(1);
  });

  test("DELETE /purge clears all data", async ({ page }) => {
    await page.goto("/");

    await altClick(page, "#btn-primary");
    await waitForModal(page);
    await skipModal(page);
    await waitForDataFile();

    const response = await page.request.delete("/__see-my-clicks", {
      data: { action: "purge" },
    });
    expect(response.ok()).toBe(true);

    const data = readDataFile();
    expect(data.sessions).toHaveLength(0);
  });
});

test.describe("Keyboard shortcuts", () => {
  test("Escape cancels the modal", async ({ page }) => {
    await page.goto("/");
    await altClick(page, "#btn-primary");
    await waitForModal(page);

    // Focus is on the textarea, Escape handler is there
    await page.locator("#__smc-input").press("Escape");
    await expect(page.locator("#__smc-modal")).toBeHidden();

    // No clicks should be written
    const data = readDataFile();
    expect(data.sessions).toHaveLength(0);
  });

  test("Enter submits the comment", async ({ page }) => {
    await page.goto("/");
    await altClick(page, "#btn-primary");
    await waitForModal(page);

    await page.fill("#__smc-input", "Enter test");
    await page.locator("#__smc-input").press("Enter");

    const data = await waitForDataFile();
    expect(data.sessions[0].clicks[0].comment).toBe("Enter test");
  });
});
