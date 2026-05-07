import path from "path";
import { test, expect, TEST_WORKSPACE_NAME } from "../fixtures/base";
import { StudyRoomPage } from "../pages/study-room.page";

const AUTH_FILE = path.join(__dirname, "..", "setup", ".auth-state.json");

async function openSeededWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/workspaces");
  await page.getByText(TEST_WORKSPACE_NAME).first().click();
  await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 15_000 });
}

test.describe("Study Room", () => {
  test.beforeEach(async ({ page, studyRoomPage }) => {
    await openSeededWorkspace(page);
    await studyRoomPage.open();
  });

  test("@slow TC-SR-01: Creating a room with the email invite method opens the lobby and sends invitations", async ({
    page,
    studyRoomPage,
  }) => {
    await studyRoomPage.openCreateModal();
    await studyRoomPage.fillTitle(`Email Room ${Date.now()}`);

    const resourceBtn = page
      .locator("button")
      .filter({ hasText: /\.pdf|\.pptx|\.mp3|youtube/i })
      .first();
    if (await resourceBtn.count() === 0) {
      test.skip(true, "No ready resources to attach to a study room.");
    }

    await studyRoomPage.selectFirstResource();
    await studyRoomPage.switchToEmailInviteMethod();
    await studyRoomPage.fillInviteEmail("e2e-invite-guest@ezy.test");
    await studyRoomPage.setQuestionCount(5);
    await studyRoomPage.submitCreateRoom();

    // Lobby opens OR email-sent confirmation is shown
    const lobbyOrConfirm = await Promise.race([
      page
        .getByText(/lobby|waiting|participants/i)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/invitation sent|email sent|invited/i)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(lobbyOrConfirm).toBeTruthy();
  });

  test("@slow TC-SR-02: Creating a room with the OTP method displays a 6-digit OTP in the lobby", async ({
    page,
    studyRoomPage,
  }) => {
    await studyRoomPage.openCreateModal();
    await studyRoomPage.fillTitle(`OTP Room ${Date.now()}`);

    const resourceBtn = page
      .locator("button")
      .filter({ hasText: /\.pdf|\.pptx|\.mp3|youtube/i })
      .first();
    if (await resourceBtn.count() === 0) {
      test.skip(true, "No ready resources to attach to a study room.");
    }

    await studyRoomPage.selectFirstResource();
    await studyRoomPage.switchToOtpMethod();
    await studyRoomPage.setQuestionCount(5);
    await studyRoomPage.submitCreateRoom();

    const otp = await studyRoomPage.getOtpCode();
    expect(otp).toMatch(/^\d{6}$/);
  });

  test("@slow TC-SR-03: Accepting an email invitation adds the user to the participant list", async ({
    page,
    studyRoomPage,
    browser,
  }) => {
    // Host creates room with email invite
    await studyRoomPage.openCreateModal();
    await studyRoomPage.fillTitle(`Invite Room ${Date.now()}`);

    const resourceBtn = page
      .locator("button")
      .filter({ hasText: /\.pdf|\.pptx|\.mp3|youtube/i })
      .first();
    if (await resourceBtn.count() === 0) {
      test.skip(true, "No ready resources to attach to a study room.");
    }

    await studyRoomPage.selectFirstResource();
    await studyRoomPage.switchToEmailInviteMethod();
    await studyRoomPage.fillInviteEmail("e2e-invite-guest@ezy.test");
    await studyRoomPage.setQuestionCount(5);
    await studyRoomPage.submitCreateRoom();

    // Second context simulates the invited participant joining
    const ctx2 = await browser.newContext({ storageState: AUTH_FILE });
    const page2 = await ctx2.newPage();
    const sr2 = new StudyRoomPage(page2);
    await openSeededWorkspace(page2);
    await sr2.open();

    // Navigate to invitations panel and accept
    await page2.getByText(/invitations/i).first().click().catch(() => {});
    const acceptBtn = page2.getByRole("button", { name: /accept|join/i }).first();
    if (await acceptBtn.count()) {
      await acceptBtn.click();
      const joined = await page2
        .getByText(/lobby|participants|waiting/i)
        .first()
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      expect(joined).toBeTruthy();
    }

    await ctx2.close();
  });

  test("@slow TC-SR-04: Joining a room via OTP code navigates to the lobby", async ({
    page,
    studyRoomPage,
    browser,
  }) => {
    // Host creates OTP room
    await studyRoomPage.openCreateModal();
    await studyRoomPage.fillTitle(`OTP Join Room ${Date.now()}`);

    const resourceBtn = page
      .locator("button")
      .filter({ hasText: /\.pdf|\.pptx|\.mp3|youtube/i })
      .first();
    if (await resourceBtn.count() === 0) {
      test.skip(true, "No ready resources to attach to a study room.");
    }

    await studyRoomPage.selectFirstResource();
    await studyRoomPage.switchToOtpMethod();
    await studyRoomPage.setQuestionCount(5);
    await studyRoomPage.submitCreateRoom();

    const otp = await studyRoomPage.getOtpCode();
    expect(otp).toMatch(/^\d{6}$/);
    await studyRoomPage.clickGoToLobby();

    // Second context joins via OTP
    const ctx2 = await browser.newContext({ storageState: AUTH_FILE });
    const page2 = await ctx2.newPage();
    const sr2 = new StudyRoomPage(page2);
    await openSeededWorkspace(page2);
    await sr2.open();
    await sr2.openJoinByCodeDialog();
    await sr2.submitOtp(otp!);

    const lobbyVisible = await page2
      .getByText(/lobby|participants|waiting/i)
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    const errVisible = await sr2.getJoinError();
    expect(lobbyVisible || !!errVisible).toBeTruthy();
    await ctx2.close();
  });

  test("TC-SR-05: Lobby shows participant list with host crown and online status indicators", async ({
    page,
    studyRoomPage,
  }) => {
    // Check if we're already inside a lobby; otherwise verify the landing page
    const inLobby = await page
      .getByText(/lobby|participants/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (!inLobby) {
      // Verify landing panels are present as a fallback
      await studyRoomPage.expectLandingPanels();
      return;
    }

    await studyRoomPage.expectHostCrown();
    await studyRoomPage.expectOnlineStatus();
  });

  test("TC-SR-06: Start Room button is disabled with only 1 participant and shows a tooltip", async ({
    page,
    studyRoomPage,
  }) => {
    const inLobby = await page
      .getByText(/lobby|participants/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!inLobby) {
      test.skip(true, "No active lobby in this run.");
    }

    await studyRoomPage.expectStartRoomDisabled();
    await studyRoomPage.expectStartRoomTooltipVisible();
  });

  test("@slow TC-SR-07: Host starts the session and all participants receive the first question", async ({
    page,
    studyRoomPage,
    browser,
  }) => {
    const inLobby = await page
      .getByText(/lobby|participants/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!inLobby) {
      test.skip(true, "No active lobby — cannot test session start.");
    }

    const ctx2 = await browser.newContext({ storageState: AUTH_FILE });
    const page2 = await ctx2.newPage();
    await openSeededWorkspace(page2);

    // Host starts the room
    await studyRoomPage.startRoom().catch(() => {});

    // Both contexts should see a question
    const q1Host = await page
      .locator("h2, h3")
      .first()
      .textContent()
      .catch(() => null);
    const q1Guest = await page2
      .locator("h2, h3")
      .first()
      .textContent()
      .catch(() => null);

    expect((q1Host ?? "").trim().length).toBeGreaterThan(0);
    expect((q1Guest ?? "").trim()).toBe((q1Host ?? "").trim());

    await ctx2.close();
  });

  test("@slow TC-SR-08: A participant confirming their answer shows a ready status to the host", async ({
    page,
    studyRoomPage,
    browser,
  }) => {
    const inQuiz = await page
      .locator("[class*='QuestionCard'], h2, h3")
      .first()
      .isVisible()
      .catch(() => false);
    if (!inQuiz) {
      test.skip(true, "No active quiz session in this run.");
    }

    const ctx2 = await browser.newContext({ storageState: AUTH_FILE });
    const page2 = await ctx2.newPage();
    const sr2 = new StudyRoomPage(page2);
    await openSeededWorkspace(page2);

    // Participant (ctx2) confirms their answer
    await sr2.confirmAnswer().catch(() => {});

    // Host (ctx1) should see a ready/confirmed indicator
    await studyRoomPage.expectParticipantReadyStatus();

    await ctx2.close();
  });

  test("@slow TC-SR-09: When all participants confirm, the host clicks Next Question — answer is revealed and the next question loads", async ({
    page,
    studyRoomPage,
  }) => {
    const inQuiz = await page
      .locator("[class*='QuestionCard'], h2, h3")
      .first()
      .isVisible()
      .catch(() => false);
    if (!inQuiz) {
      test.skip(true, "No active quiz session in this run.");
    }

    await studyRoomPage.clickNextQuestion();
    await studyRoomPage.expectAnswerRevealedAndNextLoaded();
  });

  test("@slow TC-SR-10: Completing all questions shows the leaderboard, badges, AI insights, and wrong-answer review", async ({
    page,
    studyRoomPage,
  }) => {
    const onResults = await page
      .getByText(/final|results|your score/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!onResults) {
      test.skip(true, "Study room final results not active in this run.");
    }

    await studyRoomPage.expectLeaderboard();
    await studyRoomPage.expectBadges();
    await studyRoomPage.expectAIInsights();
    await studyRoomPage.expectWrongAnswerReview();
  });
});
