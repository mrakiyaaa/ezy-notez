import type { Request, Response } from "express";
import {
  generateQuiz,
  getWorkspaceQuizzes,
  getQuizById,
  getQuizWithQuestions,
  deleteQuiz,
  getOrCreateAttempt,
  submitAnswer,
  completeAttempt,
  getAttemptResults,
  type QuestionType,
} from "../services/quiz.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getUserId = (req: Request): string | null => req.user?.id ?? null;

const sendError = (res: Response, status: number, message: string): void => {
  res.status(status).json({ status: "error", message });
};

const sendSuccess = (res: Response, data?: unknown, statusCode = 200): void => {
  res.status(statusCode).json({
    status: "success",
    ...(data !== undefined && { data }),
  });
};

const VALID_QUESTION_TYPES: QuestionType[] = ["mcq", "scenario", "mixed"];

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** POST /quiz/generate */
export const generateQuizHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { workspace_id, resource_ids, question_type, question_count } = req.body;

    if (!workspace_id) {
      return sendError(res, 400, "workspace_id is required");
    }
    if (!Array.isArray(resource_ids) || resource_ids.length === 0) {
      return sendError(res, 400, "resource_ids must be a non-empty array");
    }
    if (!question_type || !VALID_QUESTION_TYPES.includes(question_type)) {
      return sendError(res, 400, "question_type must be one of: mcq, scenario, mixed");
    }
    const count = Number(question_count);
    if (!count || count < 1 || count > 20) {
      return sendError(res, 400, "question_count must be between 1 and 20");
    }

    const quiz = await generateQuiz(
      workspace_id,
      userId,
      resource_ids,
      question_type as QuestionType,
      count,
    );

    sendSuccess(res, quiz, 201);
  } catch (err) {
    console.error("[quiz:generate]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to generate quiz");
  }
};

/** GET /quiz/workspace/:workspaceId */
export const getWorkspaceQuizzesHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { workspaceId } = req.params;
    if (!workspaceId) return sendError(res, 400, "workspaceId is required");

    const quizzes = await getWorkspaceQuizzes(workspaceId, userId);
    sendSuccess(res, quizzes);
  } catch (err) {
    console.error("[quiz:list]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch quizzes");
  }
};

/** GET /quiz/:quizId/status */
export const getQuizStatusHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { quizId } = req.params;
    const quiz = await getQuizById(quizId);
    if (!quiz) return sendError(res, 404, "Quiz not found");

    sendSuccess(res, quiz);
  } catch (err) {
    console.error("[quiz:status]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch quiz status");
  }
};

/** GET /quiz/:quizId/attempt/:attemptId/results */
export const getAttemptResultsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { quizId, attemptId } = req.params;
    const results = await getAttemptResults(quizId, attemptId);
    if (!results) return sendError(res, 404, "Results not found");

    sendSuccess(res, results);
  } catch (err) {
    console.error("[quiz:results]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch results");
  }
};

/** GET /quiz/:quizId */
export const getQuizByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { quizId } = req.params;
    // correct_option_id is excluded from this response
    const quiz = await getQuizWithQuestions(quizId, false);
    if (!quiz) return sendError(res, 404, "Quiz not found");

    sendSuccess(res, quiz);
  } catch (err) {
    console.error("[quiz:get]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch quiz");
  }
};

/** POST /quiz/:quizId/attempt */
export const getOrCreateAttemptHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { quizId } = req.params;

    // Verify quiz exists and is ready
    const quiz = await getQuizById(quizId);
    if (!quiz) return sendError(res, 404, "Quiz not found");
    if (quiz.status !== "ready") {
      return sendError(res, 409, `Quiz is not ready (status: ${quiz.status})`);
    }

    const attempt = await getOrCreateAttempt(quizId, userId);
    sendSuccess(res, attempt);
  } catch (err) {
    console.error("[quiz:attempt]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to get or create attempt");
  }
};

/** PATCH /quiz/attempt/:attemptId/answer */
export const submitAnswerHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { attemptId } = req.params;
    const { question_id, selected_option_id } = req.body;

    if (!question_id) return sendError(res, 400, "question_id is required");
    if (!selected_option_id) return sendError(res, 400, "selected_option_id is required");

    const attempt = await submitAnswer(attemptId, question_id, selected_option_id);
    sendSuccess(res, attempt);
  } catch (err) {
    console.error("[quiz:submitAnswer]", err);
    const msg = err instanceof Error ? err.message : "Failed to submit answer";
    sendError(res, msg.includes("not found") ? 404 : 500, msg);
  }
};

/** POST /quiz/attempt/:attemptId/complete */
export const completeAttemptHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { attemptId } = req.params;
    const attempt = await completeAttempt(attemptId);
    sendSuccess(res, attempt);
  } catch (err) {
    console.error("[quiz:complete]", err);
    const msg = err instanceof Error ? err.message : "Failed to complete attempt";
    sendError(res, msg.includes("not found") ? 404 : 500, msg);
  }
};

/** DELETE /quiz/:quizId */
export const deleteQuizHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { quizId } = req.params;
    await deleteQuiz(quizId);
    sendSuccess(res);
  } catch (err) {
    console.error("[quiz:delete]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete quiz");
  }
};
