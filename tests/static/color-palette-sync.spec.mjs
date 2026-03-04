import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

/**
 * Extracts a color array from source text by finding the named variable
 * declaration and then collecting all hex color strings within its array
 * literal.
 *
 * Matches patterns like:
 *   const COLOR_PALETTE = [ "#aabbcc", ... ];
 *   var SESSION_COLORS = [ "#aabbcc", ... ];
 */
function extractColorArray(source, varName) {
  // Match from the variable declaration to the closing ];
  const re = new RegExp(
    `(?:const|var)\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`
  );
  const match = source.match(re);
  if (!match) {
    throw new Error(`Could not find ${varName} in source`);
  }
  const arrayLiteral = match[1];
  // Extract all hex color strings from within the array literal
  const colors = [...arrayLiteral.matchAll(/"(#[0-9a-fA-F]{6})"/g)].map(
    (m) => m[1]
  );
  if (colors.length === 0) {
    throw new Error(`No hex colors found in ${varName}`);
  }
  return colors;
}

test("COLOR_PALETTE in server.js matches SESSION_COLORS in client-source.js", () => {
  const serverSrc = fs.readFileSync(
    path.join(ROOT, "src/server.js"),
    "utf-8"
  );
  const clientSrc = fs.readFileSync(
    path.join(ROOT, "src/client-source.js"),
    "utf-8"
  );

  const serverPalette = extractColorArray(serverSrc, "COLOR_PALETTE");
  const clientPalette = extractColorArray(clientSrc, "SESSION_COLORS");

  expect(serverPalette).toEqual(clientPalette);
});
