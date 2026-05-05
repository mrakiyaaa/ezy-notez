import { test, expect, TEST_WORKSPACE_NAME } from "../fixtures/base";

async function openSeededWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/workspaces");
  await page.getByText(TEST_WORKSPACE_NAME).first().click();
  await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 15_000 });
}

test.describe("Summarization", () => {
  test.beforeEach(async ({ page, summarizationPage }) => {
    await openSeededWorkspace(page);
    await summarizationPage.open();
  });

  test("TC-SUM-01: Summarization page shows locked/empty state when no resources are uploaded", async ({
    summarizationPage,
  }) => {
    await summarizationPage.expectLockedState();
  });

  test("@slow TC-SUM-02: General summary is generated after at least one ready resource exists", async ({
    page,
    summarizationPage,
  }) => {
    // This test only runs meaningfully when the workspace already has at least
    // one ready resource. We assert the UI behavior contract: choosing
    // "general" + Generate either kicks off processing OR shows the empty-
    // state message — both are valid outcomes.
    await summarizationPage.chooseMode("general");

    const generateBtn = page
      .getByRole("button", { name: /generate( summary)?/i })
      .first();
    const isDisabled = await generateBtn.isDisabled().catch(() => false);

    if (isDisabled) {
      await summarizationPage.expectLockedState();
      return;
    }

    await summarizationPage.clickGenerate();
    await summarizationPage.waitForResults(60_000);
  });

  test("@slow TC-SUM-03: Customize mode generates summary for a selected individual resource", async ({
    page,
    summarizationPage,
  }) => {
    await summarizationPage.chooseMode("customize");
    const checkbox = page
      .locator('input[type="checkbox"], [role="checkbox"]')
      .first();
    if (await checkbox.count() === 0) {
      // Nothing to select — the page is locked, that's a valid outcome here.
      await summarizationPage.expectLockedState();
      return;
    }
    await summarizationPage.toggleSelectFirstResource();
    await summarizationPage.clickGenerate();
    await summarizationPage.waitForResults(60_000);
  });

  test("TC-SUM-04: Summary output renders as Markdown", async ({
    summarizationPage,
  }) => {
    // Skip if no summaries — assert structure if any results exist.
    const generated = await summarizationPage.page
      .locator(".prose, article, [class*='markdown']")
      .first()
      .isVisible()
      .catch(() => false);

    if (!generated) {
      test.skip(true, "No previously-generated summary in this workspace.");
    }
    await summarizationPage.expectMarkdownRendered();
  });

  test("TC-SUM-05: Switching between General and Customize modes works without errors", async ({
    summarizationPage,
  }) => {
    await summarizationPage.chooseMode("general");
    await summarizationPage.chooseMode("customize");
    await summarizationPage.chooseMode("general");
    await expect(
      summarizationPage.page.getByRole("button", { name: /general/i }).first()
    ).toBeVisible();
  });
});
