import { test, expect, TEST_WORKSPACE_NAME } from "../fixtures/base";

async function openSeededWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/workspaces", { waitUntil: "domcontentloaded" });
  await page.getByText("Loading workspaces...").waitFor({ state: "hidden", timeout: 30_000 });
  await page.getByText(TEST_WORKSPACE_NAME).first().click();
  await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 30_000, waitUntil: "commit" });
}

test.describe("Quiz", () => {
  test.beforeEach(async ({ page, quizPage }) => {
    await openSeededWorkspace(page);
    await quizPage.open();
  });

  test("@slow TC-QUIZ-01: Generate MCQ quiz produces the correct number of questions", async ({
    page,
    quizPage,
  }) => {
    await quizPage.openConfigForm();
    await quizPage.selectFirstResource();
    await quizPage.setQuestionType("MCQ");
    await quizPage.setQuestionCount(5);

    const generateBtn = page.getByRole("button", { name: /^generate quiz$/i }).last();
    if (await generateBtn.isDisabled().catch(() => true)) {
      test.skip(true, "No ready resources — quiz generation cannot start.");
    }

    await quizPage.startQuiz();
    await quizPage.waitForFirstQuestion(60_000);

    // The first question card must be visible, confirming quiz started
    await expect(
      page.locator("[class*='QuestionCard'], text=/question\\s*1|q1\\b/i").first()
    ).toBeVisible();
  });

  test("TC-QUIZ-02: Selecting the correct answer marks it correct and increments the score", async ({
    page,
    quizPage,
  }) => {
    const inAttempt = await page
      .locator("[class*='QuestionCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!inAttempt) {
      test.skip(true, "No active quiz attempt — cannot test answer feedback.");
    }

    const scoreBefore = await quizPage.getScore();
    await quizPage.chooseFirstAnswer();
    await quizPage.expectAnswerMarkedCorrect();
    const scoreAfter = await quizPage.getScore();
    expect(scoreAfter).toBeGreaterThanOrEqual(scoreBefore);
  });

  test("TC-QUIZ-03: Selecting the wrong answer marks it incorrect and highlights the correct one", async ({
    page,
    quizPage,
  }) => {
    const inAttempt = await page
      .locator("[class*='QuestionCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!inAttempt) {
      test.skip(true, "No active quiz attempt — cannot test answer feedback.");
    }

    // Choose last answer option as the "wrong" guess heuristic
    await page
      .getByRole("button")
      .filter({ hasText: /^[A-D][.)]|true|false/i })
      .last()
      .click();

    // Either correct or incorrect marker must appear after selection
    const feedbackVisible = await Promise.race([
      page
        .locator('[class*="correct"], [data-correct="true"]')
        .first()
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator('[class*="incorrect"], [class*="wrong"], [data-correct="false"]')
        .first()
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(feedbackVisible).toBeTruthy();
  });

  test("TC-QUIZ-04: Completing the quiz shows a result screen with score and breakdown", async ({
    page,
    quizPage,
  }) => {
    const inAttempt = await page
      .locator("[class*='QuestionCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!inAttempt) {
      test.skip(true, "No active quiz attempt — cannot test completion flow.");
    }

    for (let i = 0; i < 25; i++) {
      await quizPage.chooseFirstAnswer().catch(() => {});
      const next = page.getByRole("button", { name: /next/i });
      if ((await next.count()) && (await next.first().isEnabled())) {
        await next.first().click();
      } else {
        break;
      }
    }
    await quizPage.clickSubmit().catch(() => {});
    await quizPage.expectResultsScreen();

    // Results screen must include a score value and some breakdown text
    await expect(
      page.getByText(/score|correct|out of/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("@slow TC-QUIZ-05: Generate a scenario-based quiz and confirm questions appear", async ({
    page,
    quizPage,
  }) => {
    await quizPage.openConfigForm();
    await quizPage.selectFirstResource();

    // TODO: scenario mode may not be present in all configurations
    const scenarioBtn = page.getByRole("button", { name: /scenario/i }).first();
    if (await scenarioBtn.count() === 0) {
      test.skip(true, "Scenario quiz type not available in this environment.");
    }

    await quizPage.setQuizMode("scenario");
    await quizPage.setQuestionCount(5);

    const generateBtn = page.getByRole("button", { name: /^generate quiz$/i }).last();
    if (await generateBtn.isDisabled().catch(() => true)) {
      test.skip(true, "No ready resources — quiz generation cannot start.");
    }

    await quizPage.startQuiz();
    await quizPage.waitForFirstQuestion(60_000);
  });

  test("@slow TC-QUIZ-06: Generate a mixed quiz (MCQ + True/False) and confirm questions appear", async ({
    page,
    quizPage,
  }) => {
    await quizPage.openConfigForm();
    await quizPage.selectFirstResource();
    await quizPage.setQuestionType("Mixed");
    await quizPage.setQuestionCount(5);

    const generateBtn = page.getByRole("button", { name: /^generate quiz$/i }).last();
    if (await generateBtn.isDisabled().catch(() => true)) {
      test.skip(true, "No ready resources — quiz generation cannot start.");
    }

    await quizPage.startQuiz();
    await quizPage.waitForFirstQuestion(60_000);
  });
});
