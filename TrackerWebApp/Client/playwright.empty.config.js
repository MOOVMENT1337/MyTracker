import { defineConfig } from "@playwright/test";
import config from "./playwright.config.js";

export default defineConfig({
  ...config,
  testMatch: "**/empty.spec.js",
  testIgnore: [],
  outputDir: "test-results/empty",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/empty", open: "never" }],
  ],
  webServer: { ...config.webServer, env: { TRACKER_TEST_EMPTY: "1" } },
});
