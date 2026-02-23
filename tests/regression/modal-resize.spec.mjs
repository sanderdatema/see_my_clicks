import { expect, test } from "@playwright/test";
import { getClientScript } from "../../src/client.js";

const CLIENT_SCRIPT = getClientScript();

function installFetchStub() {
  const emptyStore = { sessions: [] };

  window.fetch = async function (input, init) {
    const url = String(input || "");
    const method = (init && init.method) || "GET";

    if (url.includes("/__see-my-clicks")) {
      return { ok: true, json: async () => emptyStore };
    }

    if (method === "POST") {
      return {
        ok: true,
        json: async () => ({
          sessionId: "s-1",
          sessionName: null,
          sessionColor: "#8b5cf6",
          totalClicks: 1,
        }),
      };
    }

    if (method === "PUT" || method === "DELETE") {
      return { ok: true, json: async () => ({ ok: true }) };
    }

    return { ok: true, json: async () => emptyStore };
  };
}

async function bootClient(page) {
  await page.addInitScript(installFetchStub);
  await page.setContent(`
    <main style="padding:24px;">
      <button id="target">Capture target</button>
      <div id="outside" style="margin-top:24px;">Outside area</div>
    </main>
  `);
  await page.evaluate((script) => {
    const el = document.createElement("script");
    el.textContent = script;
    document.head.appendChild(el);
  }, CLIENT_SCRIPT);
}

test("modal stays open when click starts inside and ends outside", async ({
  page,
}) => {
  await bootClient(page);

  await page.click("#target", { modifiers: ["Alt"] });

  const modal = page.locator("#__smc-modal");
  const input = page.locator("#__smc-input");

  await expect(modal).toBeVisible();

  const longComment =
    "Long regression comment that should survive resize-like drag interactions.";
  await input.fill(longComment);

  // Emulate a native resize drag:
  // 1) pointer down inside the modal 2) click event lands outside.
  await input.dispatchEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  await page.locator("#outside").dispatchEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
  });

  await expect(modal).toBeVisible();
  await expect(input).toHaveValue(longComment);
});

test("normal outside click still dismisses the modal", async ({ page }) => {
  await bootClient(page);

  await page.click("#target", { modifiers: ["Alt"] });
  const modal = page.locator("#__smc-modal");

  await expect(modal).toBeVisible();
  await page.click("#outside");
  await expect(modal).toBeHidden();
});
