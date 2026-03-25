import { defineConfig } from "vite";
import { seeMyClicks } from "../../../src/index.js";

export default defineConfig({
  plugins: [seeMyClicks({ outputFile: ".see-my-clicks/e2e-test.json" })],
});
