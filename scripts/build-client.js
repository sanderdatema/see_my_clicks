#!/usr/bin/env node
import fs from "fs";
import path from "path";

const clientDir = path.resolve("src/client");
const outputFile = path.resolve("src/client-source.js");

const files = fs.readdirSync(clientDir)
  .filter(f => f.endsWith(".js"))
  .sort();

const banner = "// Style: ES5-compatible — no const/let/template literals/arrow functions.\n" +
  "// This file is injected raw into the browser via transformIndexHtml.\n" +
  "// AUTO-GENERATED from src/client/ — do not edit directly.\n" +
  "// Run: npm run build:client\n";

const content = files
  .map(f => {
    const code = fs.readFileSync(path.join(clientDir, f), "utf-8");
    return "  // ── " + f + " " + "─".repeat(Math.max(0, 60 - f.length)) + "\n\n" + code.split("\n").map(line => line ? "  " + line : line).join("\n");
  })
  .join("\n\n");

const output = banner + "(function () {\n" + content + "\n})();\n";

fs.writeFileSync(outputFile, output);
console.log("Built client-source.js from " + files.length + " files (" + output.length + " bytes)");
