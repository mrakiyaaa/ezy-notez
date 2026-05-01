import axios from "axios";
import { apiClient } from "@/api/axios-config";
import type {
  CreateStudyRoomPayload,
  StudyRoom,
  ActiveInvitation,
  RecentRoom,
  HostedRoom,
  Participant,
  StudyRoomQuestion,
  StudyRoomResults,
  StudyRoomStats,
  PendingInvite,
  VoiceJoinResponse,
  VoiceParticipantRow,
} from "@/types/studyRoom";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * Create a new study room.
 * Returns the created room with OTP code if applicable.
 */
export async function createStudyRoom(
  payload: CreateStudyRoomPayload
): Promise<StudyRoom> {
  try {
    const response = await apiClient.post("/study-rooms", {
      workspace_id: payload.workspace_id,
      title: payload.title,
      description: payload.description,
      question_count: payload.question_count,
      resource_ids: payload.resource_ids,
      invite_method: payload.invite_method,
      emails: payload.emails,
    });
    return response.data.data as StudyRoom;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to create study room"));
  }
}

/**
 * Join a room using an OTP code.
 */
export async function joinRoomWithOtp(
  roomId: string,
  otp: string
): Promise<{ success: boolean; room: StudyRoom }> {
  try {
    const response = await apiClient.post(`/study-rooms/${roomId}/join-otp`, {
      otp_code: otp,
    });
    return response.data.data as { success: boolean; room: StudyRoom };
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to join room"));
  }
}

/**
 * Start the room quiz (host only).
 */
export async function startRoom(roomId: string): Promise<void> {
  try {
    await apiClient.post(`/study-rooms/${roomId}/start`);
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to start room"));
  }
}

/**
 * Submit an answer for the current question.
 */
export async function submitAnswer(
  roomId: string,
  questionId: string,
  answer: number
): Promise<{ correct: boolean; points: number }> {
  try {
    const answerLetter = ["A", "B", "C", "D"][answer] ?? "A";
    const response = await apiClient.post(`/study-rooms/${roomId}/answer`, {
      question_id: questionId,
      selected_answer: answerLetter,
    });
    return response.data.data as { correct: boolean; points: number };
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to submit answer"));
  }
}

/**
 * Move to next question (host only).
 * current_question_id is required by the backend to fetch the answer/explanation.
 */
export async function nextQuestion(
  roomId: string,
  currentQuestionId?: string
): Promise<StudyRoomQuestion | null> {
  try {
    const response = await apiClient.post(`/study-rooms/${roomId}/next`, {
      current_question_id: currentQuestionId ?? "",
    });
    const data = response.data.data as { completed?: boolean; question?: StudyRoomQuestion };
    if (data.completed) return null;
    return data.question ?? null;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to advance question"));
  }
}

/**
 * Get results for a completed room.
 */
export async function getResults(roomId: string): Promise<StudyRoomResults> {
  try {
    const response = await apiClient.get(`/study-rooms/${roomId}/results`);
    return response.data.data as StudyRoomResults;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to fetch results"));
  }
}

/**
 * Get AI-generated insights for a completed room.
 */
export async function getInsights(
  roomId: string
): Promise<{ insights: string }> {
  try {
    const response = await apiClient.post(`/study-rooms/${roomId}/insights`);
    return response.data.data as { insights: string };
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to generate insights"));
  }
}

/**
 * Fetch active invitations for the current user in this workspace.
 */
export async function getActiveInvitations(
  workspaceId: string
): Promise<ActiveInvitation[]> {
  try {
    const response = await apiClient.get(`/study-rooms/invitations?workspace_id=${workspaceId}`);
    return (response.data.data ?? []) as ActiveInvitation[];
  } catch {
    return [];
  }
}

/**
 * Fetch recent rooms the user participated in.
 */
export async function getRecentRooms(
  workspaceId: string
): Promise<RecentRoom[]> {
  try {
    const response = await apiClient.get(`/study-rooms/recent?workspace_id=${workspaceId}`);
    return (response.data.data ?? []) as RecentRoom[];
  } catch {
    return [];
  }
}

/**
 * Fetch rooms hosted by the current user.
 */
export async function getHostedRooms(
  workspaceId: string
): Promise<HostedRoom[]> {
  try {
    const response = await apiClient.get(`/study-rooms/hosted?workspace_id=${workspaceId}`);
    return (response.data.data ?? []) as HostedRoom[];
  } catch {
    return [];
  }
}

/**
 * Fetch lobby participants for a room.
 */
export async function getLobbyParticipants(
  roomId: string
): Promise<Participant[]> {
  try {
    const response = await apiClient.get(`/study-rooms/${roomId}`);
    const data = response.data.data as { participants?: Participant[] };
    return data.participants ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single study room by id (used by route pages to hydrate
 * lobby / session / results entrypoints).
 */
export async function getStudyRoomById(roomId: string): Promise<StudyRoom> {
  try {
    const response = await apiClient.get(`/study-rooms/${roomId}`);
    const data = response.data.data as { room: StudyRoom };
    return data.room;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to fetch study room"));
  }
}

/**
 * Fetch the current active question for a live quiz.
 */
export async function getCurrentQuestion(
  roomId: string
): Promise<StudyRoomQuestion> {
  try {
    const response = await apiClient.get(`/study-rooms/${roomId}/current-question`);
    return response.data.data as StudyRoomQuestion;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to fetch current question"));
  }
}

/**
 * Validate and retrieve an invite by token.
 */
export async function getInviteByToken(
  token: string
): Promise<{ room: StudyRoom; email: string }> {
  try {
    const response = await apiClient.get(`/study-rooms/invite/${token}`);
    const data = response.data.data as { invite: { email: string }; room: StudyRoom };
    return { room: data.room, email: data.invite.email };
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Invalid or expired invite link"));
  }
}

/**
 * Accept an invite by token (joins the participant to the room).
 */
export async function acceptInvite(
  token: string
): Promise<{ room_id: string }> {
  try {
    const response = await apiClient.post(`/study-rooms/invite/${token}/accept`);
    return response.data.data as { room_id: string };
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to accept invite"));
  }
}

/**
 * Send email invitations to additional friends from the lobby.
 */
export async function sendLobbyInvites(
  roomId: string,
  emails: string[]
): Promise<{ sent: number; skipped: number }> {
  try {
    const response = await apiClient.post(`/study-rooms/${roomId}/invite`, { emails });
    return response.data.data as { sent: number; skipped: number };
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to send invitations"));
  }
}

/**
 * Fetch study room stats for the landing page stats bar.
 */
export async function getStudyRoomStats(
  workspaceId: string
): Promise<StudyRoomStats> {
  try {
    const response = await apiClient.get(`/study-rooms/stats?workspace_id=${workspaceId}`);
    return response.data.data as StudyRoomStats;
  } catch {
    return { hostedCount: 0, playedCount: 0, totalPoints: 0 };
  }
}

/**
 * Fetch all pending study room email invitations for the current user.
 * Used by the workspace hub page to surface invitation cards.
 */
export async function getPendingInvites(): Promise<PendingInvite[]> {
  try {
    const response = await apiClient.get("/study-rooms/invites/pending");
    return (response.data.data ?? []) as PendingInvite[];
  } catch {
    return [];
  }
}

/**
 * Join a study room by its 6-digit OTP code (no room ID required).
 * Returns the room's id and workspace_id so the caller can navigate.
 */
export async function joinRoomByCode(
  otpCode: string,
): Promise<{ id: string; workspace_id: string }> {
  try {
    const response = await apiClient.post("/study-rooms/join-by-code", {
      otp_code: otpCode,
    });
    const { room } = response.data.data as { room: { id: string; workspace_id: string } };
    return room;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to join room"));
  }
}

/**
 * Dismiss a pending invite — sets status to 'dismissed' on the backend.
 */
export async function dismissInvite(inviteId: string): Promise<void> {
  try {
    await apiClient.delete(`/study-rooms/invites/${inviteId}`);
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to dismiss invite"));
  }
}

/**
 * Delete a hosted study room. Host only — cascades remove participants,
 * invites, questions, and answers.
 */
export async function deleteStudyRoom(roomId: string): Promise<void> {
  try {
    await apiClient.delete(`/study-rooms/${roomId}`);
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to delete room"));
  }
}

/**
 * Validate room membership and register the user as an active voice
 * participant. Returns the existing roster so the client knows whom to dial.
 */
export async function joinVoiceRoom(roomId: string): Promise<VoiceJoinResponse> {
  try {
    const response = await apiClient.post(`/study-rooms/${roomId}/voice/join`);
    return response.data.data as VoiceJoinResponse;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to join voice room"));
  }
}

/**
 * Best-effort cleanup of voice presence. Failures are swallowed because the
 * call typically fires during page unload.
 */
export async function leaveVoiceRoom(roomId: string): Promise<void> {
  try {
    await apiClient.post(`/study-rooms/${roomId}/voice/leave`);
  } catch {
    /* swallow — presence times out on the server */
  }
}

/**
 * Fetch the current voice roster (without joining).
 */
export async function getVoiceParticipants(
  roomId: string,
): Promise<VoiceParticipantRow[]> {
  try {
    const response = await apiClient.get(
      `/study-rooms/${roomId}/voice/participants`,
    );
    const data = response.data.data as { participants?: VoiceParticipantRow[] };
    return data.participants ?? [];
  } catch {
    return [];
  }
}
