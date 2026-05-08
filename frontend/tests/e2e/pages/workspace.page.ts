import { Page, expect } from "@playwright/test";

export class WorkspacePage {
  constructor(public readonly page: Page) {}

  async gotoHub(): Promise<void> {
    await this.page.goto("/workspaces", { waitUntil: "domcontentloaded" });
    await this.page.waitForURL(/\/workspaces\/?$/, { timeout: 30_000 });
    // "Loading workspaces..." disappears once the API call resolves.
    // waitFor("hidden") succeeds immediately when the element was never present
    // (fast loads), so this is safe regardless of timing.
    // We do NOT use networkidle — the page holds a Supabase realtime WebSocket
    // and a WebGL canvas that keep the network perpetually open in CI.
    await this.page
      .getByText("Loading workspaces...")
      .waitFor({ state: "hidden", timeout: 30_000 });
  }

  async openCreateModal(): Promise<void> {
    // CreateWorkspaceCard renders as the first grid tile with text "New workspace".
    // waitFor("visible") before click prevents clicking mid-animation (Framer Motion
    // stagger delays can leave the element in the DOM but not yet interactive).
    const createCard = this.page
      .getByRole("button", { name: /new workspace/i })
      .first();
    if (await createCard.count()) {
      await createCard.waitFor({ state: "visible", timeout: 15_000 });
      await createCard.click();
      return;
    }
    // Empty-state path: no workspaces yet — "Create your first workspace" button
    const emptyBtn = this.page
      .getByRole("button", { name: /create your first workspace/i })
      .first();
    if (await emptyBtn.count()) {
      await emptyBtn.waitFor({ state: "visible", timeout: 15_000 });
      await emptyBtn.click();
      return;
    }
    await this.page.locator('[class*="border-dashed"]').first().click();
  }

  async fillWorkspaceName(name: string): Promise<void> {
    await this.page.getByLabel(/workspace name/i).fill(name);
  }

  async fillWorkspaceDescription(description: string): Promise<void> {
    await this.page.getByLabel(/^description/i).fill(description);
  }

  async submitCreate(): Promise<void> {
    await this.page
      .getByRole("button", { name: /^create$/i })
      .click();
  }

  async createWorkspace(name: string, description = ""): Promise<void> {
    await this.openCreateModal();
    await this.fillWorkspaceName(name);
    if (description) await this.fillWorkspaceDescription(description);
    await this.submitCreate();
  }

  async getModalErrorText(): Promise<string | null> {
    const modal = this.page.locator(".bg-red-500\\/20, [class*='bg-red-500/20']").first();
    if (await modal.count() === 0) return null;
    return (await modal.textContent())?.trim() ?? null;
  }

  async getWorkspaceCardCount(): Promise<number> {
    // WorkspaceCard renders an h3 with the workspace name.
    // CreateWorkspaceCard has no h3, so this count equals the number of user workspaces.
    const section = this.page.locator("section").filter({ hasText: /your workspaces/i });
    if (await section.count()) return section.locator("h3").count();
    return 0;
  }

  async openWorkspaceByName(name: string): Promise<void> {
    await this.page.getByText(name, { exact: true }).first().click();
    await this.page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 15_000 });
  }

  async expectInsideWorkspace(): Promise<void> {
    await expect(this.page).toHaveURL(/\/workspaces\/[^/]+/);
  }

  async expectSidebarNavItems(): Promise<void> {
    const items = [
      "Resources",
      "Chattie",
      "Summarization",
      "Flashcards",
      "Study Room",
      "Quiz",
    ];
    for (const label of items) {
      await expect(this.page.getByRole("button", { name: label })).toBeVisible();
    }
  }

  async clickNav(
    label:
      | "Home"
      | "Resources"
      | "Chattie"
      | "Summarization"
      | "Flashcards"
      | "Study Room"
      | "Quiz"
  ): Promise<void> {
    await this.page.getByRole("button", { name: label }).click();
  }

  async getWorkspaceNameFromHeader(): Promise<string | null> {
    const header = this.page.locator("header span.text-\\[14px\\]").first();
    if (await header.count() === 0) return null;
    return (await header.textContent())?.trim() ?? null;
  }

  async openProfileMenu(): Promise<void> {
    // TODO: confirm selector once profile avatar/button is inspected in the hub
    const profileBtn = this.page
      .locator('[class*="avatar"], [aria-label*="profile" i], [data-testid="profile-button"]')
      .first();
    if (await profileBtn.count()) {
      await profileBtn.click();
      return;
    }
    await this.page
      .getByRole("button", { name: /profile|account/i })
      .first()
      .click();
  }

  async expectProfileMenuOpen(): Promise<void> {
    await expect(
      this.page
        .locator('[role="menu"], [class*="dropdown"], [class*="Drawer"]')
        .first()
    ).toBeVisible({ timeout: 5_000 });
  }
}
