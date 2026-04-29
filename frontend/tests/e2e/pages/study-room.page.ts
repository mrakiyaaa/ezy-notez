import { Page, expect } from "@playwright/test";

export class StudyRoomPage {
  constructor(public readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole("button", { name: "Study Room" }).click();
    await expect(
      this.page.getByRole("heading", { name: /study room/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectLandingPanels(): Promise<void> {
    await expect(this.page.getByText(/recent rooms/i)).toBeVisible();
    await expect(this.page.getByText(/my hosted rooms|hosted rooms/i)).toBeVisible();
    await expect(this.page.getByText(/invitations/i).first()).toBeVisible();
  }

  async openCreateModal(): Promise<void> {
    await this.page
      .getByRole("button", { name: /create room/i })
      .first()
      .click();
  }

  async fillTitle(title: string): Promise<void> {
    await this.page.getByPlaceholder(/data structures review/i).fill(title);
  }

  async setQuestionCount(count: number): Promise<void> {
    await this.page.locator('input[type="number"]').first().fill(String(count));
  }

  async selectFirstResource(): Promise<void> {
    const item = this.page
      .locator("button")
      .filter({ hasText: /\.pdf|\.pptx|\.mp3|youtube/i })
      .first();
    if (await item.count()) await item.click();
  }

  async submitCreateRoom(): Promise<void> {
    await this.page.getByRole("button", { name: /^create room$/i }).click();
  }

  async getValidationError(): Promise<string | null> {
    const err = this.page.locator(".text-red-300, .text-red-400, [class*='red']").first();
    if (await err.count() === 0) return null;
    return (await err.textContent())?.trim() ?? null;
  }

  async getOtpCode(): Promise<string | null> {
    // OTP shown as 6 individual digit boxes after creation
    const digits = this.page.locator(
      "div.w-11.h-14, span.w-11.h-14"
    );
    const count = await digits.count();
    if (count < 6) {
      // fallback: any 6-digit text in a heading-ish area
      const text = await this.page.locator("body").textContent();
      const match = text?.match(/\b(\d{6})\b/);
      return match?.[1] ?? null;
    }
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += ((await digits.nth(i).textContent()) ?? "").trim();
    }
    return code.length === 6 ? code : null;
  }

  async clickGoToLobby(): Promise<void> {
    await this.page.getByRole("button", { name: /go to lobby/i }).click();
  }

  async openJoinByCodeDialog(): Promise<void> {
    await this.page.getByRole("button", { name: /join by code/i }).click();
  }

  async submitOtp(code: string): Promise<void> {
    await this.page.getByPlaceholder(/code|otp|6.?digit/i).first().fill(code);
    await this.page.getByRole("button", { name: /^join$|join room/i }).click();
  }

  async getJoinError(): Promise<string | null> {
    const err = this.page.locator(".text-red-300, .text-red-400").first();
    if (await err.count() === 0) return null;
    return (await err.textContent())?.trim() ?? null;
  }

  async getParticipantCount(): Promise<number> {
    const text = await this.page
      .locator("text=/participants?\\s*\\(?\\d+\\)?/i")
      .first()
      .textContent()
      .catch(() => null);
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async startRoom(): Promise<void> {
    await this.page.getByRole("button", { name: /start (room|quiz)/i }).click();
  }

  async getCurrentQuestionText(): Promise<string | null> {
    const card = this.page.locator("h2, h3").first();
    if (await card.count() === 0) return null;
    return (await card.textContent())?.trim() ?? null;
  }

  async submitFirstAnswer(): Promise<void> {
    await this.page
      .getByRole("button")
      .filter({ hasText: /^[A-D][.)]|true|false/i })
      .first()
      .click();
    const submit = this.page.getByRole("button", { name: /submit/i }).first();
    if (await submit.count() && (await submit.isEnabled())) {
      await submit.click();
    }
  }

  async getLeaderboardEntries(): Promise<number> {
    return this.page
      .locator("[class*='Leaderboard'], [class*='leaderboard'], li")
      .count();
  }

  async expectFinalResults(): Promise<void> {
    await expect(
      this.page.getByText(/final|results|your score/i).first()
    ).toBeVisible({ timeout: 30_000 });
  }
}
