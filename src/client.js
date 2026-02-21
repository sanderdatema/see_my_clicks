import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Returns the client-side script string that gets injected into the page.
 * Reads from client-source.js at plugin init time (framework-agnostic).
 */
export function getClientScript() {
  return fs.readFileSync(path.join(__dirname, "client-source.js"), "utf-8");
}
