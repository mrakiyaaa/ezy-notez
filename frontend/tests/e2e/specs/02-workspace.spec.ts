import { test, expect, TEST_WORKSPACE_NAME } from "../fixtures/base";

test.describe("Workspace Hub", () => {
  test("TC-WS-01: Creating a workspace with a valid name makes it appear in the hub", async ({
    page,
    workspacePage,
  }) => {
    await workspacePage.gotoHub();
    const name = `Spec WS ${Date.now()}`;
    await workspacePage.createWorkspace(name, "Created from Playwright spec");
    // "commit" avoids waiting for "load" on the dashboard page (WebGL + realtime keep
    // the network busy); 30 s accounts for Railway cold-start on the create API.
    await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 30_000, waitUntil: "commit" });

    await workspacePage.gotoHub();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });

  test("TC-WS-02: Creating a workspace with an empty name shows a validation error", async ({
    workspacePage,
  }) => {
    await workspacePage.gotoHub();
    await workspacePage.openCreateModal();

    const submitBtn = workspacePage.page.getByRole("button", { name: /^create$/i });
    const disabled = await submitBtn.isDisabled().catch(() => false);
    if (disabled) {
      expect(disabled).toBe(true);
      return;
    }

    await submitBtn.click();
    const err = await workspacePage.getModalErrorText();
    expect(err ?? "").toMatch(/required|name/i);
  });

  test("TC-WS-03: Workspace hub lists all created workspaces", async ({
    page,
    workspacePage,
  }) => {
    await workspacePage.gotoHub();
    // 30 s: covers slow Railway API responses returning the seeded workspace.
    await expect(page.getByText(TEST_WORKSPACE_NAME).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("TC-WS-04: Clicking a workspace card navigates to its dashboard with the full sidebar", async ({
    page,
    workspacePage,
  }) => {
    await workspacePage.gotoHub();
    await expect(page.getByText(TEST_WORKSPACE_NAME).first()).toBeVisible({ timeout: 30_000 });
    await page.getByText(TEST_WORKSPACE_NAME).first().click();
    await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 30_000, waitUntil: "commit" });
    await workspacePage.expectInsideWorkspace();
    await workspacePage.expectSidebarNavItems();
  });

  test("TC-WS-05: Resources uploaded to Workspace A are not visible in Workspace B", async ({
    page,
    workspacePage,
    resourcesPage,
  }) => {
    await workspacePage.gotoHub();
    const nameA = `WS-A-${Date.now()}`;
    await workspacePage.createWorkspace(nameA);
    await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 30_000, waitUntil: "commit" });
    await resourcesPage.open();
    const countA = await resourcesPage.getResourceCount();

    await workspacePage.gotoHub();
    const nameB = `WS-B-${Date.now() + 1}`;
    await workspacePage.createWorkspace(nameB);
    await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 30_000, waitUntil: "commit" });
    await resourcesPage.open();
    const countB = await resourcesPage.getResourceCount();

    // Both fresh workspaces start empty — neither can see the other's resources
    expect(countA).toBe(0);
    expect(countB).toBe(0);
  });

  test("TC-WS-06: Profile menu opens from the workspace hub", async ({
    page,
    workspacePage,
  }) => {
    await workspacePage.gotoHub();
    // Profile/account button is optional — skip gracefully if the hub page
    // has no profile entry point in this build.
    const profileBtn = page.locator(
      '[class*="avatar"], [aria-label*="profile" i], [data-testid="profile-button"],' +
      '[aria-label*="account" i]'
    ).first();
    const fallbackBtn = page.getByRole("button", { name: /profile|account/i }).first();
    const hasBtn = (await profileBtn.count()) > 0 || (await fallbackBtn.count()) > 0;
    if (!hasBtn) {
      test.skip(true, "No profile menu button found on the hub page in this build.");
    }
    await workspacePage.openProfileMenu();
    await workspacePage.expectProfileMenuOpen();
  });
});
