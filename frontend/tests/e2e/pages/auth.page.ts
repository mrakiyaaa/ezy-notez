import { Page, expect } from "@playwright/test";

export class AuthPage {
  constructor(public readonly page: Page) {}

  async gotoLogin(): Promise<void> {
    await this.page.goto("/auth/login");
  }

  async gotoSignup(): Promise<void> {
    await this.page.goto("/auth/signup");
  }

  async fillLogin(email: string, password: string): Promise<void> {
    await this.page.getByPlaceholder("you@example.com").fill(email);
    await this.page.getByPlaceholder("••••••••").fill(password);
  }

  async submitLogin(): Promise<void> {
    await this.page.getByRole("button", { name: /sign in/i }).click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.gotoLogin();
    await this.fillLogin(email, password);
    await this.submitLogin();
  }

  async signup(
    fullName: string,
    email: string,
    password: string,
    confirmPassword?: string
  ): Promise<void> {
    await this.gotoSignup();
    await this.page.getByPlaceholder("Your full name").fill(fullName);
    await this.page.getByPlaceholder("you@example.com").fill(email);
    await this.page.getByPlaceholder("Min. 8 characters").fill(password);
    await this.page
      .getByPlaceholder("Repeat your password")
      .fill(confirmPassword ?? password);
    await this.page
      .getByRole("button", { name: /create account/i })
      .click();
  }

  async getErrorText(): Promise<string | null> {
    const err = this.page.locator("p.text-red-400, p.text-red-300").first();
    // Auth calls are async — wait up to 8 s for the error element to appear
    // before concluding there is no error.
    try {
      await err.waitFor({ state: "visible", timeout: 8_000 });
    } catch {
      return null;
    }
    return (await err.textContent())?.trim() ?? null;
  }

  async expectAtLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\/auth\/login/);
  }

  async expectAtWorkspaceHub(): Promise<void> {
    await this.page.waitForURL(/\/workspaces(?:$|\?|\/)/, { timeout: 30_000 });
    await expect(this.page.getByText(/workspace hub/i)).toBeVisible();
  }

  async logout(): Promise<void> {
    // The app exposes logout via Supabase client; emulate by clearing storage
    // and navigating to login. UI-driven logout is not yet wired.
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // ignore
      }
    });
    await this.page.goto("/auth/login");
  }
}
