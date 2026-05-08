import path from "path";
import fs from "fs";
import { test, expect, TEST_WORKSPACE_NAME } from "../fixtures/base";

const FIXTURE_DIR = path.join(__dirname, "..", "fixtures", "files");

function ensureFixtureFile(name: string, content: Buffer | string): string {
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }
  const full = path.join(FIXTURE_DIR, name);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, content);
  }
  return full;
}

const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF", "utf8");
const PPTX_BYTES = Buffer.from("PKfake-pptx", "utf8");
const AUDIO_BYTES = Buffer.from("ID3   fake-mp3", "utf8");

async function openSeededWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/workspaces", { waitUntil: "domcontentloaded" });
  await page.getByText("Loading workspaces...").waitFor({ state: "hidden", timeout: 30_000 });
  await page.getByText(TEST_WORKSPACE_NAME).first().click();
  await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 30_000, waitUntil: "commit" });
}

test.describe("Resources", () => {
  test.beforeEach(async ({ page, resourcesPage }) => {
    await openSeededWorkspace(page);
    await resourcesPage.open();
  });

  test("@slow TC-RES-01: Uploading a valid PDF shows it in the list and status reaches Ready", async ({
    page,
    resourcesPage,
  }) => {
    const filename = `e2e-pdf-${Date.now()}.pdf`;
    const file = ensureFixtureFile(filename, PDF_BYTES);
    await resourcesPage.uploadFiles([file]);
    await expect(page.getByText(filename, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
    await resourcesPage.waitForResourceReady(filename, 120_000);
  });

  test("@slow TC-RES-02: Uploading a PPTX file shows it in the list and status reaches Ready", async ({
    page,
    resourcesPage,
  }) => {
    const filename = `e2e-pptx-${Date.now()}.pptx`;
    const file = ensureFixtureFile(filename, PPTX_BYTES);
    await resourcesPage.uploadFiles([file]);
    await expect(page.getByText(filename, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
    await resourcesPage.waitForResourceReady(filename, 120_000);
  });

  test("@slow TC-RES-03: Uploading an audio file triggers Whisper transcription and status reaches Ready", async ({
    page,
    resourcesPage,
  }) => {
    const filename = `e2e-audio-${Date.now()}.mp3`;
    const file = ensureFixtureFile(filename, AUDIO_BYTES);
    await resourcesPage.uploadFiles([file]);
    await expect(page.getByText(filename, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
    // Audio transcription via Whisper can take longer than other types
    await resourcesPage.waitForResourceReady(filename, 180_000);
  });

  test("@slow TC-RES-04: Submitting a YouTube URL with captions adds the resource and status reaches Ready", async ({
    page,
    resourcesPage,
  }) => {
    await resourcesPage.fillYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await resourcesPage.submitYoutube();
    await expect(
      page.getByText(/dQw4w9WgXcQ|youtu/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await resourcesPage.waitForResourceReady("dQw4w9WgXcQ", 120_000);
  });

  test("TC-RES-05: Submitting a YouTube URL without captions shows a user-facing error", async ({
    resourcesPage,
  }) => {
    await resourcesPage.fillYoutubeUrl("https://example.com/not-a-video");
    await resourcesPage.submitYoutube();
    const err = await resourcesPage.getYoutubeError();
    expect(err ?? "").toMatch(/valid youtube url|captions|not available|error/i);
  });

  test("TC-RES-06: Searching / filtering by filename dynamically narrows the resource list", async ({
    page,
    resourcesPage,
  }) => {
    // Try free-text search first; fall back to tab filter if no search input exists
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.count()) {
      await resourcesPage.searchByFilename("nonexistent-xyz-file");
      // List should show 0 matches (or an empty-state message)
      const noResults = await page
        .getByText(/no results|no resources found|nothing found/i)
        .first()
        .isVisible()
        .catch(() => false);
      const count = await resourcesPage.getResourceCount();
      expect(noResults || count === 0).toBeTruthy();
    } else {
      // Fall back: verify tab filter renders and is interactive
      await resourcesPage.clickFilterTab("Youtube");
      await expect(page.getByRole("button", { name: "Youtube" })).toBeVisible();
    }
  });

  test("TC-RES-07: AI features are locked when the workspace has no resources", async ({
    page,
    workspacePage,
    resourcesPage,
  }) => {
    const freshName = `Fresh-WS-${Date.now()}`;
    await page.goto("/workspaces");
    await workspacePage.createWorkspace(freshName);
    await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 20_000 });

    // Summarization is the canonical AI feature to check for locked state
    await page.getByRole("button", { name: "Summarization" }).click();
    await resourcesPage.expectAIFeaturesLocked();
  });
});
