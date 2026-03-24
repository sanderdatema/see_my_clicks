import fs from "fs";
import path from "path";

const SCRIPT_TAG = '<script src="/__see-my-clicks/client.js"></script>';
const SCRIPT_MARKER = "see-my-clicks/client.js";

/**
 * Returns "sveltekit" if @sveltejs/kit is found in any of the common
 * package.json locations relative to cwd, otherwise returns null.
 */
export function detect() {
  const candidates = [
    "package.json",
    "frontend/package.json",
    "client/package.json",
    "web/package.json",
    "app/package.json",
  ];
  for (const rel of candidates) {
    const pkgPath = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps["@sveltejs/kit"]) return "sveltekit";
    } catch (e) {
      console.warn(
        `[see-my-clicks] Warning: could not read ${pkgPath}: ${e.message}`
      );
    }
  }
  return null;
}

/**
 * Injects the see-my-clicks client script tag into src/app.html.
 * Checks cwd and common subdirectories for the file.
 */
export function patch() {
  const appHtml = _findAppHtml();
  if (!appHtml) {
    console.warn(
      "  \u26a0 SvelteKit detected but src/app.html not found.\n" +
        "  Add this to your app.html manually:\n" +
        `  ${SCRIPT_TAG}`
    );
    return;
  }
  const { abs, rel } = appHtml;
  const html = fs.readFileSync(abs, "utf-8");
  if (html.includes(SCRIPT_MARKER)) {
    console.log(`  ${rel} already has the client script, skipping.`);
    return;
  }
  if (!html.includes("</body>")) {
    console.warn(
      `  \u26a0 ${rel} has no </body> tag — add the script tag manually:\n` +
        `  ${SCRIPT_TAG}`
    );
    return;
  }
  const patched = html.replace("</body>", `  ${SCRIPT_TAG}\n</body>`);
  fs.writeFileSync(abs, patched);

  // Verify the write succeeded
  const verify = fs.readFileSync(abs, "utf-8");
  if (verify.includes(SCRIPT_MARKER)) {
    console.log(`  Patched ${rel} with client script tag (SvelteKit).`);
  } else {
    console.warn(
      `  \u26a0 Wrote to ${rel} but the script tag was not found after writing.\n` +
        `  Add it manually:\n` +
        `  ${SCRIPT_TAG}`
    );
  }
}

function _findAppHtml() {
  const candidates = [
    "src/app.html",
    "frontend/src/app.html",
    "client/src/app.html",
    "web/src/app.html",
    "app/src/app.html",
  ];
  for (const rel of candidates) {
    const abs = path.resolve(process.cwd(), rel);
    if (fs.existsSync(abs)) return { abs, rel };
  }
  return null;
}
