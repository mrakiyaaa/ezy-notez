import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  generateQuizHandler,
  getWorkspaceQuizzesHandler,
  getQuizStatusHandler,
  getAttemptResultsHandler,
  getQuizByIdHandler,
  getOrCreateAttemptHandler,
  submitAnswerHandler,
  completeAttemptHandler,
  deleteQuizHandler,
} from "../controllers/quiz.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Generate a new quiz from resources
router.post("/generate", generateQuizHandler);

// Get all quizzes for a workspace with attempt data
router.get("/workspace/:workspaceId", getWorkspaceQuizzesHandler);

// Attempt routes — registered before /:quizId to avoid param conflicts
router.patch("/attempt/:attemptId/answer", submitAnswerHandler);
router.post("/attempt/:attemptId/complete", completeAttemptHandler);

// Quiz-scoped routes — specific paths before /:quizId catch-all
router.get("/:quizId/status", getQuizStatusHandler);
router.get("/:quizId/attempt/:attemptId/results", getAttemptResultsHandler);
router.get("/:quizId", getQuizByIdHandler);
router.post("/:quizId/attempt", getOrCreateAttemptHandler);
router.delete("/:quizId", deleteQuizHandler);

export default router;
