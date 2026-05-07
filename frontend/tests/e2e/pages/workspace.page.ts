import { Page, expect } from "@playwright/test";

export class WorkspacePage {
  constructor(public readonly page: Page) {}

  async gotoHub(): Promise<void> {
    await this.page.goto("/workspaces");
    await this.page.waitForLoadState("networkidle");
  }

  async openCreateModal(): Promise<void> {
    const createBtn = this.page
      .getByRole("button", { name: /create.*workspace|new workspace/i })
      .first();
    if (await createBtn.count()) {
      await createBtn.click();
      return;
    }
    // Fallback: dashed/empty state card with a "+" or "Create your first workspace" text
    const emptyCreate = this.page.getByText(/create your first workspace/i);
    if (await emptyCreate.count()) {
      await emptyCreate.click();
      return;
    }
    // Final fallback: WorkspaceGrid contains a CreateWorkspaceCard rendered as a tile
    await this.page
      .locator('[class*="dashed"], [class*="border-dashed"]')
      .first()
      .click();
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
    const cards = this.page.locator('[class*="workspace-card"], [data-testid="workspace-card"]');
    if (await cards.count() > 0) return cards.count();
    // Fallback: count h3/h4 inside the workspaces grid section
    const list = this.page
      .locator("section")
      .filter({ hasText: /your workspaces/i })
      .locator("h3, h4");
    return list.count();
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
