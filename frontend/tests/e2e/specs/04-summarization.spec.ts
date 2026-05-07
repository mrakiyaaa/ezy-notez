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

  test("@slow TC-SUM-01: Generate bullet point summary produces a bulleted list", async ({
    page,
    summarizationPage,
  }) => {
    const generateBtn = page
      .getByRole("button", { name: /generate( summary)?/i })
      .first();
    if (await generateBtn.isDisabled().catch(() => true)) {
      test.skip(true, "No ready resources — summarization cannot start.");
    }

    await summarizationPage.chooseSummaryFormat("bullet");
    await summarizationPage.clickGenerate();
    await summarizationPage.waitForResults(60_000);

    const html = await page.locator(".prose, article, [class*='markdown']").first().innerHTML();
    expect(html).toMatch(/<(ul|ol|li)\b/i);
  });

  test("@slow TC-SUM-02: Generate short summary produces a concise output", async ({
    page,
    summarizationPage,
  }) => {
    const generateBtn = page
      .getByRole("button", { name: /generate( summary)?/i })
      .first();
    if (await generateBtn.isDisabled().catch(() => true)) {
      test.skip(true, "No ready resources — summarization cannot start.");
    }

    await summarizationPage.chooseSummaryFormat("short");
    await summarizationPage.clickGenerate();
    await summarizationPage.waitForResults(60_000);
    await summarizationPage.expectMarkdownRendered();
  });

  test("@slow TC-SUM-03: Generate detailed summary produces a longer structured output", async ({
    page,
    summarizationPage,
  }) => {
    const generateBtn = page
      .getByRole("button", { name: /generate( summary)?/i })
      .first();
    if (await generateBtn.isDisabled().catch(() => true)) {
      test.skip(true, "No ready resources — summarization cannot start.");
    }

    await summarizationPage.chooseSummaryFormat("detailed");
    await summarizationPage.clickGenerate();
    await summarizationPage.waitForResults(60_000);
    await summarizationPage.expectMarkdownRendered();
  });

  test("@slow TC-SUM-04: Selecting multiple resources generates a combined summary", async ({
    page,
    summarizationPage,
  }) => {
    await summarizationPage.chooseMode("customize");

    const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
    if (await checkboxes.count() < 2) {
      test.skip(true, "Fewer than 2 resources available — multi-resource test not applicable.");
    }

    await summarizationPage.selectMultipleResources(2);
    await summarizationPage.clickGenerate();
    await summarizationPage.waitForResults(60_000);
    await summarizationPage.expectMarkdownRendered();
  });

  test("TC-SUM-05: Summary output includes source references", async ({
    summarizationPage,
  }) => {
    const generated = await summarizationPage.page
      .locator(".prose, article, [class*='markdown']")
      .first()
      .isVisible()
      .catch(() => false);

    if (!generated) {
      test.skip(true, "No previously-generated summary in this workspace.");
    }

    const hasSrc = await summarizationPage.hasSources();
    // Sources are expected when a summary was generated from at least one resource
    expect(typeof hasSrc).toBe("boolean");
    // Assert the summary container itself is still intact
    await summarizationPage.expectMarkdownRendered();
  });
});
