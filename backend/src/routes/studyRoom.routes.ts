import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  createRoomHandler,
  joinWithOtpHandler,
  joinByCodeHandler,
  getInviteHandler,
  acceptInviteHandler,
  sendLobbyInvitesHandler,
  startRoomHandler,
  submitAnswerHandler,
  nextQuestionHandler,
  getRoomResultsHandler,
  generateInsightsHandler,
  getCurrentQuestionHandler,
  getActiveInvitationsHandler,
  getRecentRoomsHandler,
  getHostedRoomsHandler,
  getPendingInvitesHandler,
  dismissInviteHandler,
  getStatsHandler,
  getRoomHandler,
  deleteRoomHandler,
} from "../controllers/studyRoom.controller";
import {
  getVoiceParticipantsHandler,
  joinVoiceHandler,
  leaveVoiceHandler,
} from "../controllers/voiceRoom.controller";

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
router.get("/stats", getStatsHandler);

// Join by OTP code (no roomId required — looks up room by code)
router.post("/join-by-code", joinByCodeHandler);

// Pending email invites for the current user (hub page)
router.get("/invites/pending", getPendingInvitesHandler);
router.delete("/invites/:inviteId", dismissInviteHandler);

// Room creation
router.post("/", createRoomHandler);

// ── Room-scoped routes ───────────────────────────────────────────────────────

router.post("/:roomId/join-otp", joinWithOtpHandler);
router.post("/:roomId/invite", sendLobbyInvitesHandler);
router.post("/:roomId/start", startRoomHandler);
router.post("/:roomId/answer", submitAnswerHandler);
router.post("/:roomId/next", nextQuestionHandler);
router.get("/:roomId/results", getRoomResultsHandler);
router.post("/:roomId/insights", generateInsightsHandler);
router.get("/:roomId/current-question", getCurrentQuestionHandler);

// Voice (WebRTC) — discovery + membership validation. Signaling itself
// happens over Supabase Realtime on channel `voice-room-{roomId}`.
router.get("/:roomId/voice/participants", getVoiceParticipantsHandler);
router.post("/:roomId/voice/join", joinVoiceHandler);
router.post("/:roomId/voice/leave", leaveVoiceHandler);

// Room detail — catch-all, must be last
router.get("/:roomId", getRoomHandler);
router.delete("/:roomId", deleteRoomHandler);

export default router;
