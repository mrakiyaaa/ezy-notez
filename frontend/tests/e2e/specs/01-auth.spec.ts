import { test, expect } from "../fixtures/base";
import { TEST_USER } from "../setup/global-setup";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("TC-AUTH-01: Valid registration creates account and redirects to workspace hub", async ({
    page,
    authPage,
  }) => {
    const uniqueEmail = `e2e-signup-${Date.now()}@ezy.test`;
    await authPage.signup("E2E Signup User", uniqueEmail, "Test@12345");

    // Either we land on /workspaces, or we get a confirmation message.
    // Both prove the signup request was accepted by Supabase.
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

  test("TC-AUTH-02: Duplicate email registration shows error message", async ({
    authPage,
  }) => {
    await authPage.signup(
      "Duplicate User",
      TEST_USER.email,
      TEST_USER.password
    );
    const errorText = await authPage.getErrorText();
    expect(errorText ?? "").toMatch(/already (registered|exists)|already in use/i);
  });

  test("TC-AUTH-03: Login with valid credentials redirects to workspace hub", async ({
    authPage,
  }) => {
    await authPage.login(TEST_USER.email, TEST_USER.password);
    await authPage.expectAtWorkspaceHub();
  });

  test("TC-AUTH-04: Login with invalid password shows error message", async ({
    authPage,
  }) => {
    await authPage.login(TEST_USER.email, "WrongPassword!1");
    const err = await authPage.getErrorText();
    expect(err ?? "").toMatch(/incorrect|invalid/i);
  });

  test("TC-AUTH-05: Login with unregistered email shows error message", async ({
    authPage,
  }) => {
    await authPage.login(`nobody-${Date.now()}@ezy.test`, "Whatever@1234");
    const err = await authPage.getErrorText();
    expect(err ?? "").toMatch(/incorrect|invalid|not found/i);
  });

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
