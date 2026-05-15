import { defineConfig, devices, ReporterDescription } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, ".env.test") });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// These are consumed by the CI health-check steps and can be referenced in
// global-setup for diagnostic logging. They are not used by Playwright itself.
export const EXPRESS_URL = process.env.EXPRESS_URL ?? "http://localhost:3001";
export const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";

const STORAGE_STATE = path.join(__dirname, "tests/e2e/setup/.auth-state.json");
const isCI = !!process.env.CI;

const reporters: ReporterDescription[] = [
  ["list"],
  ["html", { open: "never" }],
];

if (isCI) {
  reporters.push(["github"]);
  reporters.push(["junit", { outputFile: "tests/e2e/results/junit.xml" }]);
}

export default defineConfig({
  testDir: "./tests/e2e/specs",
  outputDir: "tests/e2e/results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : "50%",
  // 60 s per test — AI-backed endpoints (summarization, quiz, flashcards, chat)
  // legitimately take 30–60 s on cold Railway dynos.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: reporters,
  globalSetup: require.resolve("./tests/e2e/setup/global-setup"),
  globalTeardown: require.resolve("./tests/e2e/setup/global-teardown"),
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
  },
  use: {
    headless: true,
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Bypass Vercel Deployment Protection on preview URLs so Playwright
    // reaches the actual app instead of the SSO wall.
    // Set VERCEL_AUTOMATION_BYPASS_SECRET in GitHub Actions secrets and in
    // the Vercel project: Settings → Deployment Protection → Protection Bypass.
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } }
      : {}),
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
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: STORAGE_STATE,
      },
      dependencies: ["auth-setup"],
    },
  ],
});
