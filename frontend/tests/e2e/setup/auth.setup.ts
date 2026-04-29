import { test as setup, expect } from "@playwright/test";
import path from "path";
import { TEST_USER } from "./global-setup";

const AUTH_FILE = path.join(__dirname, ".auth-state.json");

setup("authenticate as seeded e2e user", async ({ page }) => {
  await page.goto("/auth/login");

  await page.getByPlaceholder("you@example.com").fill(TEST_USER.email);
  await page.getByPlaceholder("••••••••").fill(TEST_USER.password);

  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/workspaces/, { timeout: 30_000 });
  await expect(page.getByText(/workspace hub/i)).toBeVisible({
    timeout: 15_000,
  });

  await page.context().storageState({ path: AUTH_FILE });
});
