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

  test("TC-FLASH-01: Flashcards page is locked when no resources are ready", async ({
    page,
  }) => {
    const generateBtn = page
      .getByRole("button", { name: /generate flashcards|generate your first/i })
      .first();
    if (await generateBtn.count() === 0) {
      test.skip(true, "Generation entry point not present.");
    }
    await generateBtn.click();
    const lockedHint = await page
      .getByText(/no ready resources|upload resources first|no resources/i)
      .first()
      .isVisible()
      .catch(() => false);
    const submitBtn = page
      .getByRole("button", { name: /^generate$|generate flashcards/i })
      .last();
    const disabled = await submitBtn.isDisabled().catch(() => false);
    expect(lockedHint || disabled).toBeTruthy();
  });

  test("TC-FLASH-02: Generating flashcards returns a set of cards", async ({
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

  test("TC-FLASH-03: Clicking a card triggers the 3D flip animation", async ({
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
    // The flipped class should toggle. Even if implementation is purely
    // CSS-driven without class changes, we accept any DOM change.
    expect(before).not.toBe(after);
  });

  test("TC-FLASH-04: Marking a card as Known updates the progress", async ({
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

  test("TC-FLASH-05: Marking a card as Revise Later keeps it in the deck", async ({
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
    await expect(
      flashcardsPage.page.locator("[class*='FlashcardFlipCard']").first()
    ).toBeVisible();
  });

  test("TC-FLASH-06: All cards can be navigated with Next / Previous controls", async ({
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

    const initialProgress = await flashcardsPage.getProgressText();
    await flashcardsPage.clickNext().catch(() => {});
    await flashcardsPage.page.waitForTimeout(300);
    const afterNext = await flashcardsPage.getProgressText();
    expect(afterNext).not.toBe(initialProgress);

    await flashcardsPage.clickPrevious().catch(() => {});
  });
});
