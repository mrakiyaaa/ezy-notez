import { Page, expect } from "@playwright/test";

export class FlashcardsPage {
  constructor(public readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole("button", { name: "Flashcards" }).click();
  }

  async expectLocked(): Promise<void> {
    const generate = this.page
      .getByRole("button", { name: /generate flashcards|generate your first/i })
      .first();
    if (await generate.count()) {
      await generate.click();
    }
    await expect(
      this.page.getByText(/no ready resources|upload resources first|no resources/i)
    ).toBeVisible({ timeout: 15_000 });
  }

  async openGenerationPanel(): Promise<void> {
    await this.page
      .getByRole("button", { name: /generate flashcards|generate your first/i })
      .first()
      .click();
  }

  async selectFirstResource(): Promise<void> {
    await this.page
      .locator("button")
      .filter({ hasText: /\.pdf|\.pptx|\.mp3|youtube/i })
      .first()
      .click();
  }

  async submitGeneration(): Promise<void> {
    await this.page
      .getByRole("button", { name: /^generate$|generate flashcards/i })
      .last()
      .click();
  }

  async waitForCards(timeoutMs = 60_000): Promise<void> {
    await expect(
      this.page.locator("[class*='FlashcardFlipCard'], [class*='Flashcard']").first()
    ).toBeVisible({ timeout: timeoutMs });
  }

  async openFirstSet(): Promise<void> {
    await this.page
      .locator("[class*='FlashcardSetCard']")
      .first()
      .click();
  }

  async clickCard(): Promise<void> {
    const card = this.page.locator("[class*='FlashcardFlipCard']").first();
    await card.click();
  }

  async isCardFlipped(): Promise<boolean> {
    const card = this.page.locator("[class*='FlashcardFlipCard']").first();
    if (await card.count() === 0) return false;
    const cls = (await card.getAttribute("class")) ?? "";
    if (/flipped|is-flipped|rotate-y-180/.test(cls)) return true;
    const inner = card.locator("[class*='flipped'], [data-flipped='true']");
    return (await inner.count()) > 0;
  }

  async markKnown(): Promise<void> {
    await this.page
      .getByRole("button", { name: /^known$|got it|i know/i })
      .first()
      .click();
  }

  async markReview(): Promise<void> {
    await this.page
      .getByRole("button", { name: /review|study (again|later)|don'?t know/i })
      .first()
      .click();
  }

  async clickNext(): Promise<void> {
    await this.page.getByRole("button", { name: /next/i }).first().click();
  }

  async clickPrevious(): Promise<void> {
    await this.page.getByRole("button", { name: /previous|back/i }).first().click();
  }

  async getProgressText(): Promise<string | null> {
    const progress = this.page.locator("text=/\\d+\\s*\\/\\s*\\d+/").first();
    if (await progress.count() === 0) return null;
    return (await progress.textContent())?.trim() ?? null;
  }

  // TODO: confirm selector for the back-side content of a flipped card
  async expectCardBackVisible(): Promise<void> {
    await expect(
      this.page
        .locator('[class*="back"], [data-side="back"], [class*="Back"]')
        .first()
    ).toBeVisible({ timeout: 5_000 });
  }

  // TODO: confirm selector for revision/review-later queue counter
  async getRevisionQueueCount(): Promise<number> {
    const queue = this.page.locator(
      '[class*="revision"], [class*="review-queue"], text=/review later/i'
    );
    return queue.count();
  }

  async getProgressBreakdown(): Promise<{ known: number; review: number; unknown: number }> {
    // TODO: confirm actual progress breakdown representation in the UI
    const known = await this.page
      .locator('[class*="known"], [data-status="known"]')
      .count();
    const review = await this.page
      .locator('[class*="review"], [data-status="review"]')
      .count();
    const total = await this.page
      .locator('[class*="FlashcardFlipCard"]')
      .count();
    return { known, review, unknown: Math.max(0, total - known - review) };
  }
}
