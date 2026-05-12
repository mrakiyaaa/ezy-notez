import type { Request, Response } from "express";
import {
  broadcastParticipantJoined,
  broadcastQuizStarted,
  broadcastAnswerConfirmed,
  broadcastNextQuestion,
  broadcastRoomEnded,
} from "../services/studyRoomRealtime.service";
import {
  createRoom,
  joinRoomWithOtp,
  joinRoomByOtpCode,
  getInviteByToken,
  acceptInvite,
  sendLobbyInvites,
  startRoom,
  submitAnswer,
  nextQuestion,
  getRoomResults,
  generateRoomInsights,
  getRoomWithParticipants,
  getCurrentQuestion,
  getActiveInvitations,
  getRecentRooms,
  getHostedRooms,
  getPendingInvites,
  dismissInvite,
  getStudyRoomStats,
  deleteRoom,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  OtpExpiredError,
  DuplicateAnswerError,
} from "../services/studyRoom.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getUserId = (req: Request): string | null => req.user?.id ?? null;

const sendError = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, message });
};

const sendSuccess = (res: Response, data?: unknown, statusCode = 200): void => {
  res.status(statusCode).json({
    success: true,
    ...(data !== undefined && { data }),
  });
};

const resolveStatus = (err: unknown): number => {
  if (
    err instanceof NotFoundError ||
    err instanceof ValidationError ||
    err instanceof ForbiddenError ||
    err instanceof OtpExpiredError ||
    err instanceof DuplicateAnswerError
  ) {
    return err.statusCode;
  }
  return 500;
};

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "An unexpected error occurred";

// ---------------------------------------------------------------------------
// POST /api/study-rooms
// ---------------------------------------------------------------------------

export const createRoomHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { workspace_id, title, description, question_count, resource_ids, invite_method, emails } =
      req.body;

    if (!workspace_id) return sendError(res, 400, "workspace_id is required");
    if (!title || typeof title !== "string" || title.trim() === "") {
      return sendError(res, 400, "title is required");
    }
    const count = Number(question_count);
    if (!count || count < 20) {
      return sendError(res, 400, "question_count must be at least 20");
    }
    if (!Array.isArray(resource_ids) || resource_ids.length === 0) {
      return sendError(res, 400, "resource_ids must be a non-empty array");
    }
    if (invite_method !== "otp" && invite_method !== "email") {
      return sendError(res, 400, "invite_method must be 'otp' or 'email'");
    }
    if (invite_method === "email") {
      if (!Array.isArray(emails) || emails.length === 0) {
        return sendError(res, 400, "emails must be a non-empty array when invite_method is 'email'");
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const room = await createRoom({
      userId,
      workspaceId: workspace_id,
      title: title.trim(),
      description: description ?? undefined,
      questionCount: count,
      resourceIds: resource_ids,
      inviteMethod: invite_method,
      emails: invite_method === "email" ? emails : undefined,
      frontendUrl,
    });

    sendSuccess(res, room, 201);
  } catch (err) {
    console.error("[studyRoom:create]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/join-otp
// ---------------------------------------------------------------------------

export const joinWithOtpHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const { otp_code } = req.body;

    if (!otp_code) return sendError(res, 400, "otp_code is required");

    const participants = await joinRoomWithOtp(userId, roomId, String(otp_code));
    broadcastParticipantJoined(roomId, userId, false).catch((e) =>
      console.warn("[studyRoom:joinOtp] Broadcast failed:", e),
    );
    sendSuccess(res, { participants });
  } catch (err) {
    console.error("[studyRoom:joinOtp]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/join-by-code
// ---------------------------------------------------------------------------

export const joinByCodeHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { otp_code } = req.body;
    if (!otp_code) return sendError(res, 400, "otp_code is required");

    const room = await joinRoomByOtpCode(userId, String(otp_code));
    broadcastParticipantJoined(room.id, userId, false).catch((e) =>
      console.warn("[studyRoom:joinByCode] Broadcast failed:", e),
    );
    sendSuccess(res, { room });
  } catch (err) {
    console.error("[studyRoom:joinByCode]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/invite/:token
// ---------------------------------------------------------------------------

export const getInviteHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.params;
    const result = await getInviteByToken(token);
    sendSuccess(res, result);
  } catch (err) {
    console.error("[studyRoom:getInvite]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/invite/:token/accept
// ---------------------------------------------------------------------------

export const acceptInviteHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { token } = req.params;
    const result = await acceptInvite(userId, token);
    broadcastParticipantJoined(result.room_id, userId, false).catch((e) =>
      console.warn("[studyRoom:acceptInvite] Broadcast failed:", e),
    );
    sendSuccess(res, result);
  } catch (err) {
    console.error("[studyRoom:acceptInvite]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/invite  (send extra invites from the lobby)
// ---------------------------------------------------------------------------

export const sendLobbyInvitesHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return sendError(res, 400, "emails must be a non-empty array");
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const result = await sendLobbyInvites(userId, roomId, emails, frontendUrl);
    sendSuccess(res, result);
  } catch (err) {
    console.error("[studyRoom:sendLobbyInvites]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/start
// ---------------------------------------------------------------------------

export const startRoomHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;

    const firstQuestion = await startRoom(userId, roomId);
    broadcastQuizStarted(roomId, firstQuestion).catch((e) =>
      console.warn("[studyRoom:start] Broadcast failed:", e),
    );
    sendSuccess(res, { firstQuestion });
  } catch (err) {
    console.error("[studyRoom:start]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/answer
// ---------------------------------------------------------------------------

export const submitAnswerHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const { question_id, selected_answer } = req.body;

    if (!question_id) return sendError(res, 400, "question_id is required");
    if (!selected_answer) return sendError(res, 400, "selected_answer is required");

    const result = await submitAnswer(userId, roomId, question_id, String(selected_answer));
    broadcastAnswerConfirmed(roomId, question_id, userId, result.allConfirmed).catch((e) =>
      console.warn("[studyRoom:answer] Broadcast failed:", e),
    );
    sendSuccess(res, result);
  } catch (err) {
    console.error("[studyRoom:answer]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/next
// ---------------------------------------------------------------------------

export const nextQuestionHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const { current_question_id } = req.body;

    if (!current_question_id) {
      return sendError(res, 400, "current_question_id is required");
    }

    const result = await nextQuestion(userId, roomId, String(current_question_id));
    if (result.completed) {
      broadcastRoomEnded(roomId);
    } else if (result.question) {
      broadcastNextQuestion(roomId, result.question, String(current_question_id)).catch((e) =>
        console.warn("[studyRoom:next] Broadcast failed:", e),
      );
    }
    sendSuccess(res, result);
  } catch (err) {
    console.error("[studyRoom:next]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/:roomId/results
// ---------------------------------------------------------------------------

export const getRoomResultsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const results = await getRoomResults(userId, roomId);
    sendSuccess(res, results);
  } catch (err) {
    console.error("[studyRoom:results]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/insights
// ---------------------------------------------------------------------------

export const generateInsightsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const insights = await generateRoomInsights(userId, roomId);
    sendSuccess(res, { insights });
  } catch (err) {
    console.error("[studyRoom:insights]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/:roomId/current-question
// ---------------------------------------------------------------------------

export const getCurrentQuestionHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const question = await getCurrentQuestion(userId, roomId);
    sendSuccess(res, question);
  } catch (err) {
    console.error("[studyRoom:currentQuestion]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/invitations
// ---------------------------------------------------------------------------

export const getActiveInvitationsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const workspaceId = req.query.workspace_id as string;
    if (!workspaceId) return sendError(res, 400, "workspace_id query param is required");

    const invitations = await getActiveInvitations(userId, workspaceId);
    sendSuccess(res, invitations);
  } catch (err) {
    console.error("[studyRoom:invitations]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/recent
// ---------------------------------------------------------------------------

export const getRecentRoomsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const workspaceId = req.query.workspace_id as string;
    if (!workspaceId) return sendError(res, 400, "workspace_id query param is required");

    const rooms = await getRecentRooms(userId, workspaceId);
    sendSuccess(res, rooms);
  } catch (err) {
    console.error("[studyRoom:recent]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/hosted
// ---------------------------------------------------------------------------

export const getHostedRoomsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const workspaceId = req.query.workspace_id as string;
    if (!workspaceId) return sendError(res, 400, "workspace_id query param is required");

    const rooms = await getHostedRooms(userId, workspaceId);
    sendSuccess(res, rooms);
  } catch (err) {
    console.error("[studyRoom:hosted]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/invites/pending
// ---------------------------------------------------------------------------

export const getPendingInvitesHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const userEmail = req.user?.email;
    if (!userEmail) return sendError(res, 401, "User email not available");

    const invites = await getPendingInvites(userEmail);
    sendSuccess(res, invites);
  } catch (err) {
    console.error("[studyRoom:pendingInvites]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/study-rooms/invites/:inviteId
// ---------------------------------------------------------------------------

export const dismissInviteHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const userEmail = req.user?.email;
    if (!userEmail) return sendError(res, 401, "User email not available");

    const { inviteId } = req.params;
    await dismissInvite(inviteId, userEmail);
    sendSuccess(res);
  } catch (err) {
    console.error("[studyRoom:dismissInvite]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/stats
// ---------------------------------------------------------------------------

export const getStatsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const workspaceId = req.query.workspace_id as string;
    if (!workspaceId) return sendError(res, 400, "workspace_id query param is required");

    const stats = await getStudyRoomStats(userId, workspaceId);
    sendSuccess(res, stats);
  } catch (err) {
    console.error("[studyRoom:stats]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/study-rooms/:roomId
// ---------------------------------------------------------------------------

export const deleteRoomHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    await deleteRoom(userId, roomId);
    sendSuccess(res);
  } catch (err) {
    console.error("[studyRoom:delete]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// GET /api/study-rooms/:roomId
// ---------------------------------------------------------------------------

export const getRoomHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const result = await getRoomWithParticipants(userId, roomId);
    sendSuccess(res, result);
  } catch (err) {
    console.error("[studyRoom:get]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};
