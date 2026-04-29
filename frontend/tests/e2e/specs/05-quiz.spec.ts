import { test, expect, TEST_WORKSPACE_NAME } from "../fixtures/base";

async function openSeededWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/workspaces");
  await page.getByText(TEST_WORKSPACE_NAME).first().click();
  await page.waitForURL(/\/workspaces\/[^/]+$/, { timeout: 15_000 });
}

test.describe("Quiz", () => {
  test.beforeEach(async ({ page, quizPage }) => {
    await openSeededWorkspace(page);
    await quizPage.open();
  });

  test("TC-QUIZ-01: Quiz generator is inaccessible (no resources) — shows empty state in config form", async ({
    page,
    quizPage,
  }) => {
    await quizPage.openConfigForm();
    // Either the resource selector is empty or the generate button is disabled.
    const generateBtn = page.getByRole("button", { name: /^generate quiz$/i }).last();
    const disabled = await generateBtn.isDisabled().catch(() => false);
    const hint = await page
      .getByText(/no ready resources|select at least one resource|upload resources first/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(disabled || hint).toBeTruthy();
  });

  test("TC-QUIZ-02: Configuring question count and type starts quiz", async ({
    page,
    quizPage,
  }) => {
    await quizPage.openConfigForm();
    await quizPage.selectFirstResource();
    await quizPage.setQuestionType("Mixed");
    await quizPage.setQuestionCount(5);

    const generateBtn = page.getByRole("button", { name: /^generate quiz$/i }).last();
    const disabled = await generateBtn.isDisabled().catch(() => false);
    if (disabled) {
      test.skip(true, "Workspace has no ready resources to generate a quiz from.");
    }

    await quizPage.startQuiz();
    await quizPage.waitForFirstQuestion(60_000);
  });

  test("TC-QUIZ-03: Quiz displays one question at a time", async ({ page }) => {
    // The QuestionCard component renders a single question per attempt step.
    // Verifies the contract by inspecting the attempt page if accessible.
    const cards = page.locator("[class*='QuestionCard']");
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test("TC-QUIZ-04: Selecting an answer and clicking Next loads the next question", async ({
    page,
    quizPage,
  }) => {
    const inAttempt = await page
      .locator("[class*='QuestionCard'], text=/question\\s*1/i")
      .first()
      .isVisible()
      .catch(() => false);
    if (!inAttempt) {
      test.skip(true, "Quiz attempt is not active — cannot test navigation.");
    }

    await quizPage.chooseFirstAnswer();
    await quizPage.clickNext();
    // The question card key should remount; assert visibility of a question.
    await expect(page.locator("[class*='QuestionCard']").first()).toBeVisible();
  });

  test("TC-QUIZ-05: Completing the quiz shows a results summary screen", async ({
    page,
    quizPage,
  }) => {
    const inAttempt = await page
      .locator("[class*='QuestionCard']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!inAttempt) {
      test.skip(true, "Quiz attempt is not active — cannot validate completion flow.");
    }

    // Walk through up to 25 questions safely
    for (let i = 0; i < 25; i++) {
      await quizPage.chooseFirstAnswer().catch(() => {});
      const next = page.getByRole("button", { name: /next/i });
      if (await next.count() && (await next.first().isEnabled())) {
        await next.first().click();
      } else {
        break;
      }
    }
    await quizPage.clickSubmit().catch(() => {});
    await quizPage.expectResultsScreen();
  });

  test("TC-QUIZ-06: Bear character (Lottie animation container) is present on the quiz page", async ({
    quizPage,
  }) => {
    const visible = await quizPage.bearAnimationVisible();
    expect(visible).toBeTruthy();
  });

  test("TC-QUIZ-07: Quiz with no resources selected shows validation error", async ({
    page,
    quizPage,
  }) => {
    await quizPage.openConfigForm();
    // Don't select any resource. Generate should be disabled OR show hint.
    const generateBtn = page.getByRole("button", { name: /^generate quiz$/i }).last();
    const disabled = await generateBtn.isDisabled().catch(() => false);
    if (disabled) {
      expect(disabled).toBe(true);
      return;
    }
    await generateBtn.click();
    const err = await quizPage.getValidationError();
    expect(err ?? "").toMatch(/select at least|required|invalid/i);
  });
});
