import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  createRoomHandler,
  joinWithOtpHandler,
  joinByCodeHandler,
  getInviteHandler,
  acceptInviteHandler,
  startRoomHandler,
  submitAnswerHandler,
  nextQuestionHandler,
  getRoomResultsHandler,
  generateInsightsHandler,
  getCurrentQuestionHandler,
  getActiveInvitationsHandler,
  getRecentRoomsHandler,
  getHostedRoomsHandler,
  getRoomHandler,
} from "../controllers/studyRoom.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// ── Static collection-level routes (must be before /:roomId) ────────────────

// Invite token routes
router.get("/invite/:token", getInviteHandler);
router.post("/invite/:token/accept", acceptInviteHandler);

// Dashboard data
router.get("/invitations", getActiveInvitationsHandler);
router.get("/recent", getRecentRoomsHandler);
router.get("/hosted", getHostedRoomsHandler);

// Join by OTP code (no roomId required — looks up room by code)
router.post("/join-by-code", joinByCodeHandler);

// Room creation
router.post("/", createRoomHandler);

// ── Room-scoped routes ───────────────────────────────────────────────────────

router.post("/:roomId/join-otp", joinWithOtpHandler);
router.post("/:roomId/start", startRoomHandler);
router.post("/:roomId/answer", submitAnswerHandler);
router.post("/:roomId/next", nextQuestionHandler);
router.get("/:roomId/results", getRoomResultsHandler);
router.post("/:roomId/insights", generateInsightsHandler);
router.get("/:roomId/current-question", getCurrentQuestionHandler);

// Room detail — catch-all, must be last
router.get("/:roomId", getRoomHandler);

export default router;
