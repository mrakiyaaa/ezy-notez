import { apiClient } from "@/api/axios-config";
import type {
  Quiz,
  QuizWithQuestions,
  QuizWithAttempt,
  QuizAttempt,
  AttemptResults,
  QuestionType,
  SubmitAnswerRequest,
} from "@/types/quiz";

/**
 * Generate a new quiz from selected resources.
 * Returns the pending quiz immediately; questions are generated in background.
 */
export async function generateQuiz(
  workspaceId: string,
  resourceIds: string[],
  questionType: QuestionType,
  questionCount: number
): Promise<Quiz> {
  try {
    const response = await apiClient.post("/quiz/generate", {
      workspace_id: workspaceId,
      resource_ids: resourceIds,
      question_type: questionType,
      question_count: questionCount,
    });
    return response.data.data as Quiz;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate quiz"
    );
  }
}

/**
 * Get all quizzes for a workspace with their latest attempt data.
 * Returns both in-progress and completed quizzes.
 */
export async function getQuizzes(workspaceId: string): Promise<QuizWithAttempt[]> {
  try {
    const response = await apiClient.get(`/quiz/workspace/${workspaceId}`);
    return (response.data.data ?? []) as QuizWithAttempt[];
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch quizzes"
    );
  }
}

/**
 * Get a single quiz with all its questions.
 */
export async function getQuizQuestions(quizId: string): Promise<QuizWithQuestions> {
  try {
    const response = await apiClient.get(`/quiz/${quizId}`);
    return response.data.data as QuizWithQuestions;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to fetch quiz ${quizId}`
    );
  }
}

/**
 * Get or create an attempt for a quiz.
 * If an in-progress attempt exists, returns it.
 * Otherwise, creates a new attempt.
 */
export async function getOrCreateAttempt(quizId: string): Promise<QuizAttempt> {
  try {
    const response = await apiClient.post(`/quiz/${quizId}/attempt`);
    return response.data.data as QuizAttempt;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to get or create attempt for quiz ${quizId}`
    );
  }
}

/**
 * Submit an answer for a question in an attempt.
 * Incremental save - persists immediately to server.
 */
export async function submitAnswer(
  attemptId: string,
  answerData: SubmitAnswerRequest
): Promise<QuizAttempt> {
  try {
    const response = await apiClient.patch(
      `/quiz/attempt/${attemptId}/answer`,
      answerData
    );
    return response.data.data as QuizAttempt;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to submit answer"
    );
  }
}

/**
 * Complete an attempt and calculate final score.
 */
export async function completeAttempt(attemptId: string): Promise<QuizAttempt> {
  try {
    const response = await apiClient.post(`/quiz/attempt/${attemptId}/complete`);
    return response.data.data as QuizAttempt;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to complete attempt"
    );
  }
}

/**
 * Get full results for a completed attempt.
 * Includes question breakdown and topic analysis.
 */
export async function getAttemptResults(
  quizId: string,
  attemptId: string
): Promise<AttemptResults> {
  try {
    const response = await apiClient.get(
      `/quiz/${quizId}/attempt/${attemptId}/results`
    );
    return response.data.data as AttemptResults;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch attempt results"
    );
  }
}

/**
 * Delete a quiz and all associated attempts.
 */
export async function deleteQuiz(quizId: string): Promise<void> {
  try {
    await apiClient.delete(`/quiz/${quizId}`);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to delete quiz ${quizId}`
    );
  }
}

/**
 * Get quiz status (for polling during generation).
 */
export async function getQuizStatus(quizId: string): Promise<Quiz> {
  try {
    const response = await apiClient.get(`/quiz/${quizId}/status`);
    return response.data.data as Quiz;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to fetch quiz status ${quizId}`
    );
  }
}
