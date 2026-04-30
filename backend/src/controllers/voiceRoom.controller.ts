import type { Request, Response } from "express";
import {
  getActiveVoiceParticipants,
  registerVoiceJoin,
  registerVoiceLeave,
  ensureRoomMember,
  VOICE_MAX_PARTICIPANTS,
} from "../services/voiceRoom.service";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../services/studyRoom.service";

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
    err instanceof ForbiddenError
  ) {
    return err.statusCode;
  }
  return 500;
};

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "An unexpected error occurred";

// ---------------------------------------------------------------------------
// GET /api/study-rooms/:roomId/voice/participants
// ---------------------------------------------------------------------------

export const getVoiceParticipantsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    await ensureRoomMember(userId, roomId);

    const participants = await getActiveVoiceParticipants(roomId);
    sendSuccess(res, {
      participants,
      max_participants: VOICE_MAX_PARTICIPANTS,
    });
  } catch (err) {
    console.error("[voiceRoom:participants]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/voice/join
// Validates membership, registers presence, returns the existing participant
// list so the client knows who to dial.
// ---------------------------------------------------------------------------

export const joinVoiceHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    const result = await registerVoiceJoin(userId, roomId);

    sendSuccess(res, {
      participants: result.participants,
      warning: result.warning,
      max_participants: VOICE_MAX_PARTICIPANTS,
    });
  } catch (err) {
    console.error("[voiceRoom:join]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/voice/leave
// ---------------------------------------------------------------------------

export const leaveVoiceHandler = (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { roomId } = req.params;
    registerVoiceLeave(userId, roomId);
    sendSuccess(res);
  } catch (err) {
    console.error("[voiceRoom:leave]", err);
    sendError(res, resolveStatus(err), errorMessage(err));
  }
};
