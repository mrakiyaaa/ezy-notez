import { Page, expect } from "@playwright/test";

export class QuizPage {
  constructor(public readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole("button", { name: "Quiz" }).click();
    await expect(
      this.page.getByRole("heading", { name: /quiz generator|no quizzes yet/i })
    ).toBeVisible({ timeout: 15_000 });
  }

  async openConfigForm(): Promise<void> {
    const generate = this.page
      .getByRole("button", { name: /generate (quiz|your first quiz)/i })
      .first();
    await generate.click();
  }

  async expectLocked(): Promise<void> {
    await this.openConfigForm();
    await expect(
      this.page.getByText(/no ready resources|upload resources first|select at least one resource/i)
    ).toBeVisible({ timeout: 15_000 });
  }

  async selectFirstResource(): Promise<void> {
    const chip = this.page
      .locator("button")
      .filter({ hasText: /\.pdf|\.pptx|\.mp3|youtube|resource/i })
      .first();
    if (await chip.count()) {
      await chip.click();
    }
  }

  async setQuestionCount(count: 5 | 10 | 15 | 20): Promise<void> {
    await this.page
      .getByRole("button", { name: new RegExp(`^${count}$`) })
      .first()
      .click();
  }

  async setQuestionType(type: "MCQ" | "True/False" | "Mixed"): Promise<void> {
    await this.page.getByRole("button", { name: type }).first().click();
  }

  async startQuiz(): Promise<void> {
    await this.page
      .getByRole("button", { name: /^generate quiz$/i })
      .last()
      .click();
  }

  async waitForFirstQuestion(timeoutMs = 60_000): Promise<void> {
    await expect(
      this.page.locator("text=/question\\s*1|q1\\b/i").first()
    ).toBeVisible({ timeout: timeoutMs });
  }

  async getCurrentQuestionText(): Promise<string | null> {
    const card = this.page
      .locator("[class*='QuestionCard'], h2, h3")
      .first();
    if (await card.count() === 0) return null;
    return (await card.textContent())?.trim() ?? null;
  }

  async chooseFirstAnswer(): Promise<void> {
    await this.page
      .getByRole("button")
      .filter({ hasText: /^[A-D][.)]|true|false/i })
      .first()
      .click();
  }

  async clickNext(): Promise<void> {
    await this.page.getByRole("button", { name: /next/i }).click();
  }

  async clickSubmit(): Promise<void> {
    await this.page.getByRole("button", { name: /submit|finish/i }).click();
  }

  async expectResultsScreen(): Promise<void> {
    await expect(
      this.page.getByText(/score|results|correct|out of/i).first()
    ).toBeVisible({ timeout: 30_000 });
  }

  async bearAnimationVisible(): Promise<boolean> {
    const teddy = this.page.locator(
      "[class*='Teddy'], [class*='teddy'], canvas, dotlottie-player, [data-testid='teddy']"
    );
    return (await teddy.count()) > 0;
  }

  async getValidationError(): Promise<string | null> {
    const err = this.page.locator("text=/select at least|minimum|invalid/i").first();
    if (await err.count() === 0) return null;
    return (await err.textContent())?.trim() ?? null;
  }
}
