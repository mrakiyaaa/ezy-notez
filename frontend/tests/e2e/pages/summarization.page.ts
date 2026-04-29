import { Page, expect } from "@playwright/test";

export class SummarizationPage {
  constructor(public readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole("button", { name: "Summarization" }).click();
  }

  async expectLockedState(): Promise<void> {
    await expect(
      this.page.getByText(
        /no resources|upload (resources|files)|no resources with extracted text/i
      )
    ).toBeVisible({ timeout: 15_000 });
  }

  async chooseMode(mode: "general" | "customize"): Promise<void> {
    const label = mode === "general" ? /general/i : /customize/i;
    await this.page.getByRole("button", { name: label }).first().click();
  }

  async toggleSelectFirstResource(): Promise<void> {
    const checkbox = this.page
      .locator('input[type="checkbox"], [role="checkbox"]')
      .first();
    if (await checkbox.count()) {
      await checkbox.click();
      return;
    }
    // Resource chips/buttons fallback
    await this.page
      .locator('button:has-text(".pdf"), button:has-text(".pptx"), button:has-text(".mp3")')
      .first()
      .click();
  }

  async clickGenerate(): Promise<void> {
    await this.page
      .getByRole("button", { name: /generate( summary)?/i })
      .first()
      .click();
  }

  async waitForResults(timeoutMs = 60_000): Promise<void> {
    await expect(
      this.page.locator("article, .prose, [class*='markdown']").first()
    ).toBeVisible({ timeout: timeoutMs });
  }

  async expectMarkdownRendered(): Promise<void> {
    const container = this.page.locator(".prose, article, [class*='markdown']").first();
    await expect(container).toBeVisible();
    const innerHtml = await container.innerHTML();
    expect(innerHtml).toMatch(/<(h[1-6]|ul|ol|li|p|strong|em|code)\b/i);
  }
}
