import { test, expect } from "../fixtures/base";
import { TEST_USER } from "../setup/global-setup";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("TC-AUTH-01: Valid registration creates account and redirects to /workspaces", async ({
    page,
    authPage,
  }) => {
    const uniqueEmail = `e2e-signup-${Date.now()}@ezy.test`;
    await authPage.signup("E2E Signup User", uniqueEmail, "Test@12345");

    const reachedHub = await page
      .waitForURL(/\/workspaces/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (reachedHub) {
      await expect(page.getByText(/workspace hub/i)).toBeVisible();
    } else {
      const errText = await authPage.getErrorText();
      expect(errText ?? "").toMatch(/inbox|confirmation/i);
    }
  });

  test("TC-AUTH-02: Registration with password shorter than 8 characters shows inline validation error", async ({
    authPage,
  }) => {
    await authPage.signup(
      "Short Pass User",
      `e2e-shortpw-${Date.now()}@ezy.test`,
      "Ab1!"
    );
    const err = await authPage.getErrorText();
    expect(err ?? "").toMatch(/at least 8|minimum|too short|password/i);
  });

  test("TC-AUTH-03: Registration with mismatched passwords shows inline validation error", async ({
    authPage,
  }) => {
    await authPage.signup(
      "Mismatch User",
      `e2e-mismatch-${Date.now()}@ezy.test`,
      "Test@12345",
      "Different@999"
    );
    const err = await authPage.getErrorText();
    expect(err ?? "").toMatch(/match|identical|same password|do not match/i);
  });

  test("TC-AUTH-04: Valid login redirects to /workspaces", async ({ authPage }) => {
    await authPage.login(TEST_USER.email, TEST_USER.password);
    await authPage.expectAtWorkspaceHub();
  });

  test("TC-AUTH-05: Invalid login credentials shows error message", async ({ authPage }) => {
    await authPage.login(TEST_USER.email, "WrongPassword!1");
    const err = await authPage.getErrorText();
    expect(err ?? "").toMatch(/incorrect|invalid/i);
  });

  // ── Preserved ──────────────────────────────────────────────────────────────

  test("TC-AUTH-06: Accessing protected route while unauthenticated redirects to login", async ({
    page,
  }) => {
    await page.goto("/workspaces");
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/auth\/login/);
  });

  test("TC-AUTH-07: Logout clears session and redirects to login", async ({
    page,
    authPage,
  }) => {
    await authPage.login(TEST_USER.email, TEST_USER.password);
    await authPage.expectAtWorkspaceHub();
    await authPage.logout();
    await page.goto("/workspaces");
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/auth\/login/);
  });
});
