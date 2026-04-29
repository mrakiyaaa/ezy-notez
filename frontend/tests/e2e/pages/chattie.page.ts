import { Page, expect } from "@playwright/test";

export class ChattiePage {
  constructor(public readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole("button", { name: "Chattie" }).click();
  }

  async expectLocked(): Promise<void> {
    await expect(
      this.page.getByText(
        /no resources|upload resources first|no ready resources/i
      )
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectWavingAvatar(): Promise<void> {
    const lottie = this.page.locator(
      "dotlottie-player, [class*='lottie'], canvas"
    );
    await expect(lottie.first()).toBeVisible({ timeout: 10_000 });
  }

  async typeMessage(text: string): Promise<void> {
    await this.page.locator("textarea").first().fill(text);
  }

  async send(): Promise<void> {
    const sendBtn = this.page.getByRole("button", { name: /send/i }).first();
    if (await sendBtn.count() && (await sendBtn.isEnabled())) {
      await sendBtn.click();
      return;
    }
    await this.page.locator("textarea").first().press("Enter");
  }

  async sendMessage(text: string): Promise<void> {
    await this.typeMessage(text);
    await this.send();
  }

  async waitForAssistantReply(timeoutMs = 60_000): Promise<void> {
    const assistantMsg = this.page
      .locator("[class*='assistant'], [data-role='assistant']")
      .or(this.page.locator("article, .prose").nth(1));
    await expect(assistantMsg.first()).toBeVisible({ timeout: timeoutMs });
  }

  async getLastAssistantText(): Promise<string | null> {
    const blocks = this.page.locator(".prose, article, [class*='markdown']");
    const count = await blocks.count();
    if (count === 0) return null;
    return (await blocks.last().textContent())?.trim() ?? null;
  }

  async hasSourceReferences(): Promise<boolean> {
    const sources = this.page.locator(
      "text=/sources?:|references?:|cited from/i"
    );
    return (await sources.count()) > 0;
  }

  async sendButtonEnabled(): Promise<boolean> {
    const sendBtn = this.page.getByRole("button", { name: /send/i }).first();
    if (await sendBtn.count() === 0) return false;
    return sendBtn.isEnabled();
  }

  async messageCount(): Promise<number> {
    return this.page.locator("[class*='Message'], article, .prose").count();
  }
}
