import { test as base, expect } from "@playwright/test";
import { AuthPage } from "../pages/auth.page";
import { WorkspacePage } from "../pages/workspace.page";
import { ResourcesPage } from "../pages/resources.page";
import { SummarizationPage } from "../pages/summarization.page";
import { QuizPage } from "../pages/quiz.page";
import { FlashcardsPage } from "../pages/flashcards.page";
import { ChattiePage } from "../pages/chattie.page";
import { StudyRoomPage } from "../pages/study-room.page";

interface PageObjects {
  authPage: AuthPage;
  workspacePage: WorkspacePage;
  resourcesPage: ResourcesPage;
  summarizationPage: SummarizationPage;
  quizPage: QuizPage;
  flashcardsPage: FlashcardsPage;
  chattiePage: ChattiePage;
  studyRoomPage: StudyRoomPage;
}

export const test = base.extend<PageObjects>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  workspacePage: async ({ page }, use) => {
    await use(new WorkspacePage(page));
  },
  resourcesPage: async ({ page }, use) => {
    await use(new ResourcesPage(page));
  },
  summarizationPage: async ({ page }, use) => {
    await use(new SummarizationPage(page));
  },
  quizPage: async ({ page }, use) => {
    await use(new QuizPage(page));
  },
  flashcardsPage: async ({ page }, use) => {
    await use(new FlashcardsPage(page));
  },
  chattiePage: async ({ page }, use) => {
    await use(new ChattiePage(page));
  },
  studyRoomPage: async ({ page }, use) => {
    await use(new StudyRoomPage(page));
  },
});

export { expect };
export const TEST_WORKSPACE_NAME = "E2E Test Workspace";
