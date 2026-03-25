import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  retries: 1,
  use: {
    browserName: "chromium",
  },
  projects: [
    {
      name: "unit",
      testMatch: /\/(unit|integration|static|regression)\/.+\.spec\.mjs$/,
    },
    {
      name: "e2e",
      testMatch: /\/e2e\/.+\.spec\.mjs$/,
      use: {
        baseURL: "http://localhost:5173",
      },
    },
  ],
  webServer: {
    command: "npx vite --config tests/e2e/fixture/vite.config.js tests/e2e/fixture",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
