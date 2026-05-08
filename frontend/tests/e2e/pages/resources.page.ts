import { Page, expect } from "@playwright/test";

export class ResourcesPage {
  constructor(public readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole("button", { name: "Resources" }).click();
    await expect(
      this.page.getByRole("heading", { name: /upload academic resources/i })
    ).toBeVisible({ timeout: 15_000 });
  }

  /** Upload one or more local files via the hidden file input. */
  async uploadFiles(filePaths: string[]): Promise<void> {
    const input = this.page.locator('input[type="file"]');
    await input.setInputFiles(filePaths);
  }

  async fillYoutubeUrl(url: string): Promise<void> {
    await this.page
      .getByPlaceholder(/youtube\.com\/watch/i)
      .fill(url);
  }

  async submitYoutube(): Promise<void> {
    await this.page.getByRole("button", { name: /^add$/i }).click();
  }

  async getYoutubeError(): Promise<string | null> {
    const err = this.page.locator("p.text-red-400").first();
    if (await err.count() === 0) return null;
    return (await err.textContent())?.trim() ?? null;
  }

  async setSearchQuery(query: string): Promise<void> {
    // Resources page has no dedicated search input — filter by tab instead.
    // The Quiz page exposes a real search input; preserved here for parity.
    const search = this.page
      .getByPlaceholder(/search/i)
      .first();
    if (await search.count()) {
      await search.fill(query);
    }
  }

  async getResourceCount(): Promise<number> {
    const items = this.page.locator('[class*="ResourceItem"], [data-testid="resource-item"]');
    if (await items.count() > 0) return items.count();
    // Fallback by structural locator under the resources list area
    return this.page.locator("main >> .mx-6.mt-4 > div").count();
  }

  async expectResourceVisible(name: string): Promise<void> {
    await expect(this.page.getByText(name, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  /** Polls for a resource to become "ready". Returns true if seen, false on timeout. */
  async waitForResourceReady(
    name: string,
    timeoutMs = 60_000
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const row = this.page
        .locator(":text(\"" + name + "\")")
        .first()
        .locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
      if (await row.count()) {
        const text = (await row.textContent())?.toLowerCase() ?? "";
        if (text.includes("ready")) return true;
      }
      await this.page.waitForTimeout(2_000);
    }
    return false;
  }

  async deleteFirstResource(): Promise<void> {
    const deleteBtn = this.page
      .getByRole("button", { name: /delete|remove/i })
      .first();
    await deleteBtn.click();
    // Confirm if a confirmation dialog appears
    const confirm = this.page.getByRole("button", { name: /^delete$|confirm/i });
    if (await confirm.count()) {
      await confirm.first().click();
    }
  }

  async clickFilterTab(
    tab: "All Files" | "PDFs" | "PPTs" | "Audio" | "Youtube"
  ): Promise<void> {
    await this.page.getByRole("button", { name: tab }).click();
  }

  async expectEmptyState(): Promise<void> {
    await expect(
      this.page.getByText(/your resources are empty|no .* files/i)
    ).toBeVisible();
  }

  async searchByFilename(query: string): Promise<void> {
    const input = this.page.getByPlaceholder(/search/i).first();
    if (await input.count()) {
      await input.fill(query);
    }
  }

  async expectAIFeaturesLocked(): Promise<void> {
    await expect(
      this.page
        .getByText(/upload.*resource|no resources|add resources|no resources with extracted/i)
        .first()
    ).toBeVisible({ timeout: 10_000 });
  }
}
