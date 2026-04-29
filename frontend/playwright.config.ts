import { defineConfig, devices } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE = path.join(__dirname, "tests/e2e/setup/.auth-state.json");

export default defineConfig({
  testDir: "./tests/e2e/specs",
  outputDir: "./tests/e2e/results/artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : "50%",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/results/html-report", open: "never" }],
  ],
  globalSetup: require.resolve("./tests/e2e/setup/global-setup"),
  globalTeardown: require.resolve("./tests/e2e/setup/global-teardown"),
  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      testDir: "./tests/e2e/setup",
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
        storageState: STORAGE_STATE,
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: STORAGE_STATE,
      },
      dependencies: ["auth-setup"],
    },
  ],
});
