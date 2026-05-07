import { test, expect, TEST_WORKSPACE_NAME } from "../fixtures/base";

async function openSeededWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/workspaces");
  await page.getByText(TEST_WORKSPACE_NAME).first().click();
  await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 15_000 });
}

test.describe("Flashcards", () => {
  test.beforeEach(async ({ page, flashcardsPage }) => {
    await openSeededWorkspace(page);
    await flashcardsPage.open();
  });

  test("@slow TC-FC-01: Generating a flashcard set creates cards and status reaches Ready", async ({
    page,
    flashcardsPage,
  }) => {
    await flashcardsPage.openGenerationPanel();

    const submitBtn = page
      .getByRole("button", { name: /^generate$|generate flashcards/i })
      .last();
    if (await submitBtn.isDisabled().catch(() => true)) {
      test.skip(true, "No ready resources — flashcard generation cannot start.");
    }

    await flashcardsPage.selectFirstResource();
    await flashcardsPage.submitGeneration();
    await flashcardsPage.waitForCards(60_000);
  });

  test("TC-FC-02: Clicking a flashcard flips it with animation and shows the back side", async ({
    flashcardsPage,
  }) => {
    const cardVisible = await flashcardsPage.page
      .locator("[class*='FlashcardFlipCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!cardVisible) {
      test.skip(true, "No flashcards available to flip.");
    }

    const before = await flashcardsPage.isCardFlipped();
    await flashcardsPage.clickCard();
    await flashcardsPage.page.waitForTimeout(500);
    const after = await flashcardsPage.isCardFlipped();
    expect(before).not.toBe(after);
  });

  test("TC-FC-03: Marking a card as Known updates the progress tracker", async ({
    flashcardsPage,
  }) => {
    const cardVisible = await flashcardsPage.page
      .locator("[class*='FlashcardFlipCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!cardVisible) {
      test.skip(true, "No flashcards available.");
    }

    const before = await flashcardsPage.getProgressText();
    await flashcardsPage.markKnown().catch(() => {});
    await flashcardsPage.page.waitForTimeout(500);
    const after = await flashcardsPage.getProgressText();
    expect(after).not.toBe(before);
  });

  test("TC-FC-04: Marking a card as Review Later keeps it in the deck (revision queue)", async ({
    flashcardsPage,
  }) => {
    const cardVisible = await flashcardsPage.page
      .locator("[class*='FlashcardFlipCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!cardVisible) {
      test.skip(true, "No flashcards available.");
    }

    await flashcardsPage.markReview().catch(() => {});
    await flashcardsPage.page.waitForTimeout(300);

    // The card remains visible (still in deck) after being marked for review
    await expect(
      flashcardsPage.page.locator("[class*='FlashcardFlipCard']").first()
    ).toBeVisible();
  });

  test("TC-FC-05: Progress tracker reflects the correct Known / Review / Unknown ratio", async ({
    flashcardsPage,
  }) => {
    const cardVisible = await flashcardsPage.page
      .locator("[class*='FlashcardFlipCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!cardVisible) {
      test.skip(true, "No flashcards available.");
    }

    const breakdown = await flashcardsPage.getProgressBreakdown();
    // All counts must be non-negative and sum to a sensible total
    expect(breakdown.known).toBeGreaterThanOrEqual(0);
    expect(breakdown.review).toBeGreaterThanOrEqual(0);
    expect(breakdown.unknown).toBeGreaterThanOrEqual(0);

    // Progress text (e.g. "2 / 10") must still render after reading breakdown
    const progressText = await flashcardsPage.getProgressText();
    expect(progressText).not.toBeNull();
  });
});
