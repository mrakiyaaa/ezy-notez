import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { generateRoomQuestions, generateInsights } from "./studyRoomAI.service";
import { sendStudyRoomInvite } from "./email.service";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

export type RoomStatus = "waiting" | "in_progress" | "completed";
export type InviteMethod = "otp" | "email";

export interface StudyRoomRow {
  id: string;
  workspace_id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: RoomStatus;
  invite_method: InviteMethod;
  otp_code: string | null;
  otp_expires_at: string | null;
  question_count: number;
  resource_ids: string[];
  current_question_order: number;
  created_at: string;
}

export interface ParticipantRow {
  id: string;
  room_id: string;
  user_id: string;
  is_host: boolean;
  joined_at: string;
}

export interface InviteRow {
  id: string;
  room_id: string;
  email: string;
  token: string;
  status: "pending" | "accepted";
  created_at: string;
}

export interface QuestionRow {
  id: string;
  room_id: string;
  question: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  order_index: number;
  created_at: string;
}

export interface AnswerRow {
  id: string;
  room_id: string;
  question_id: string;
  user_id: string;
  selected_answer: string;
  is_correct: boolean;
  points_earned: number;
  answered_at: string;
}

/** Shape returned to the frontend for GET /study-rooms/:roomId/current-question */
export interface CurrentQuestionShape {
  id: string;
  room_id: string;
  question_number: number;
  question_text: string;
  options: unknown;   // {A,B,C,D} — frontend normaliseQuestion handles conversion
  correct_answer: string; // letter A–D — frontend normaliseQuestion handles conversion
  explanation: string;
}

export interface LeaderboardEntry {
  position: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  points: number;
}

export interface WrongAnswerDetail {
  question_number: number;
  question_text: string;
  options: string[];       // normalised to [A, B, C, D] string array
  selected_answer: number; // 0-based index
  correct_answer: number;  // 0-based index
  explanation: string;
}

export interface BadgeShape {
  type: string;
  label: string;
  icon: string;
  user_id: string;
}

export interface RoomResults {
  room_id: string;
  room_title: string;
  leaderboard: LeaderboardEntry[];
  wrong_answers: WrongAnswerDetail[];
  badges: BadgeShape[];
}

export interface ActiveInvitationShape {
  id: string;
  room_id: string;
  room_title: string;
  host_name: string;
  invite_method: InviteMethod;
  created_at: string;
}

export interface RecentRoomShape {
  id: string;
  title: string;
  date: string;
  participant_count: number;
  score: number;
  total_questions: number;
  status: RoomStatus;
}

export interface HostedRoomShape {
  id: string;
  title: string;
  date: string;
  participant_count: number;
  status: RoomStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a 6-digit numeric OTP string. */
const generateOtp = (): string =>
  Math.floor(100_000 + Math.random() * 900_000).toString();

/** Fetch extracted text from resources for question generation. */
const fetchResourceContent = async (
  workspaceId: string,
  resourceIds: string[],
): Promise<string> => {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .in("id", resourceIds)
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
    .not("extracted_text", "is", null);

  if (error) throw new Error(`Failed to fetch resources: ${error.message}`);

  const usable = (data ?? []).filter(
    (r: { extracted_text: string | null }) =>
      r.extracted_text && r.extracted_text.trim().length > 0,
  );

  if (usable.length === 0) {
    throw new Error(
      "None of the selected resources have extracted text. " +
        "Make sure resources have finished processing before starting a room.",
    );
  }

  return usable
    .map((r: { extracted_text: string }) => r.extracted_text.trim())
    .join("\n\n");
};

/** Map badge flags to Badge objects for a given userId */
const buildBadges = (
  userId: string,
  perfectScore: boolean,
  firstPlace: boolean,
  participation: boolean,
): BadgeShape[] => {
  const badges: BadgeShape[] = [];
  if (firstPlace)    badges.push({ type: "first_place",    label: "First Place",    icon: "🥇", user_id: userId });
  if (perfectScore)  badges.push({ type: "perfect_score",  label: "Perfect Score",  icon: "⭐", user_id: userId });
  if (participation) badges.push({ type: "participation",  label: "Participated",   icon: "🎓", user_id: userId });
  return badges;
};

/** Convert a QuestionRow to the shape expected by the frontend (normaliseQuestion-compatible) */
const toCurrentQuestionShape = (q: QuestionRow): CurrentQuestionShape => ({
  id: q.id,
  room_id: q.room_id,
  question_number: q.order_index + 1,
  question_text: q.question,
  options: q.options,
  correct_answer: q.correct_answer,
  explanation: q.explanation,
});

// ---------------------------------------------------------------------------
// createRoom
// ---------------------------------------------------------------------------

export const createRoom = async (params: {
  userId: string;
  workspaceId: string;
  title: string;
  description?: string;
  questionCount: number;
  resourceIds: string[];
  inviteMethod: InviteMethod;
  emails?: string[];
  frontendUrl: string;
}): Promise<StudyRoomRow> => {
  const {
    userId,
    workspaceId,
    title,
    description,
    questionCount,
    resourceIds,
    inviteMethod,
    emails,
    frontendUrl,
  } = params;

  const otpCode = inviteMethod === "otp" ? generateOtp() : null;
  const otpExpiresAt =
    inviteMethod === "otp"
      ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
      : null;

  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .insert({
      workspace_id: workspaceId,
      host_id: userId,
      title,
      description: description ?? null,
      status: "waiting",
      invite_method: inviteMethod,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt,
      question_count: questionCount,
      resource_ids: resourceIds,
    })
    .select()
    .single();

  if (roomErr) throw new Error(`Failed to create room: ${roomErr.message}`);

  const newRoom = room as StudyRoomRow;

  // Insert host as the first participant
  const { error: participantErr } = await supabaseAdmin
    .from("study_room_participants")
    .insert({
      room_id: newRoom.id,
      user_id: userId,
      is_host: true,
    });

  if (participantErr) {
    throw new Error(`Failed to add host participant: ${participantErr.message}`);
  }

  // Email invites
  if (inviteMethod === "email" && emails && emails.length > 0) {
    const inviteRows = emails.map((email) => ({
      room_id: newRoom.id,
      email,
      token: randomUUID(),
      status: "pending" as const,
    }));

    const { data: insertedInvites, error: inviteErr } = await supabaseAdmin
      .from("study_room_invites")
      .insert(inviteRows)
      .select("email, token");

    if (inviteErr) {
      console.warn("[studyRoom] Failed to insert invites:", inviteErr.message);
    } else {
      for (const invite of (insertedInvites ?? []) as {
        email: string;
        token: string;
      }[]) {
        const inviteUrl = `${frontendUrl}/study-room/invite/${invite.token}`;
        sendStudyRoomInvite(invite.email, title, inviteUrl).catch((e) =>
          console.warn("[studyRoom] Failed to send invite email:", e),
        );
      }
    }
  }

  return newRoom;
};

// ---------------------------------------------------------------------------
// joinRoomWithOtp
// ---------------------------------------------------------------------------

export const joinRoomWithOtp = async (
  userId: string,
  roomId: string,
  otpCode: string,
): Promise<ParticipantRow[]> => {
  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .select("id, status, otp_code, otp_expires_at")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) throw new NotFoundError("Room not found");

  const r = room as Pick<
    StudyRoomRow,
    "id" | "status" | "otp_code" | "otp_expires_at"
  >;

  if (r.status !== "waiting") {
    throw new ValidationError("Room is no longer accepting participants");
  }

  if (r.otp_code !== otpCode) {
    throw new ValidationError("Invalid OTP code");
  }

  if (!r.otp_expires_at || new Date(r.otp_expires_at) < new Date()) {
    throw new OtpExpiredError("OTP has expired");
  }

  const { data: existing } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) throw new ValidationError("You have already joined this room");

  const { error: insertErr } = await supabaseAdmin
    .from("study_room_participants")
    .insert({ room_id: roomId, user_id: userId, is_host: false });

  if (insertErr) {
    throw new Error(`Failed to join room: ${insertErr.message}`);
  }

  const { data: participants, error: listErr } = await supabaseAdmin
    .from("study_room_participants")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (listErr) throw new Error(`Failed to fetch participants: ${listErr.message}`);

  return (participants ?? []) as ParticipantRow[];
};

// ---------------------------------------------------------------------------
// joinRoomByOtpCode  (find room by OTP alone — used by "Join by Code" UI)
// ---------------------------------------------------------------------------

export const joinRoomByOtpCode = async (
  userId: string,
  otpCode: string,
): Promise<StudyRoomRow> => {
  const { data: rooms, error } = await supabaseAdmin
    .from("study_rooms")
    .select("*")
    .eq("otp_code", otpCode)
    .eq("status", "waiting")
    .limit(1);

  if (error) throw new Error(`Failed to look up room: ${error.message}`);
  if (!rooms || rooms.length === 0) {
    throw new NotFoundError("No active room found with that code");
  }

  const room = rooms[0] as StudyRoomRow;

  if (!room.otp_expires_at || new Date(room.otp_expires_at) < new Date()) {
    throw new OtpExpiredError("This OTP code has expired");
  }

  // Check not already a participant
  const { data: existing } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) throw new ValidationError("You have already joined this room");

  const { error: insertErr } = await supabaseAdmin
    .from("study_room_participants")
    .insert({ room_id: room.id, user_id: userId, is_host: false });

  if (insertErr) {
    throw new Error(`Failed to join room: ${insertErr.message}`);
  }

  return room;
};

// ---------------------------------------------------------------------------
// getInviteByToken
// ---------------------------------------------------------------------------

export const getInviteByToken = async (
  token: string,
): Promise<{ invite: InviteRow; room: StudyRoomRow }> => {
  const { data: invite, error } = await supabaseAdmin
    .from("study_room_invites")
    .select("*, study_rooms(*)")
    .eq("token", token)
    .single();

  if (error || !invite) throw new NotFoundError("Invite not found");

  if (invite.status !== "pending") {
    throw new ValidationError("This invite has already been used");
  }

  const { study_rooms: room, ...inviteData } = invite as InviteRow & {
    study_rooms: StudyRoomRow;
  };

  return { invite: inviteData as InviteRow, room };
};

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

export const acceptInvite = async (
  userId: string,
  token: string,
): Promise<{ room_id: string }> => {
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("study_room_invites")
    .select("id, room_id, status")
    .eq("token", token)
    .single();

  if (inviteErr || !invite) throw new NotFoundError("Invite not found");
  if (invite.status !== "pending") {
    throw new ValidationError("This invite has already been used");
  }

  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .select("id, status")
    .eq("id", invite.room_id)
    .single();

  if (roomErr || !room) throw new NotFoundError("Room not found");
  if (room.status !== "waiting") {
    throw new ValidationError("Room is no longer accepting participants");
  }

  const { data: existing } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", invite.room_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error: participantErr } = await supabaseAdmin
      .from("study_room_participants")
      .insert({ room_id: invite.room_id, user_id: userId, is_host: false });

    if (participantErr) {
      throw new Error(`Failed to join room: ${participantErr.message}`);
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from("study_room_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  if (updateErr) {
    console.warn("[studyRoom] Failed to mark invite accepted:", updateErr.message);
  }

  return { room_id: invite.room_id };
};

// ---------------------------------------------------------------------------
// startRoom
// ---------------------------------------------------------------------------

export const startRoom = async (
  userId: string,
  roomId: string,
): Promise<QuestionRow> => {
  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) throw new NotFoundError("Room not found");

  const r = room as StudyRoomRow;

  if (r.host_id !== userId) throw new ForbiddenError("Only the host can start the room");
  if (r.status !== "waiting") {
    throw new ValidationError(`Room cannot be started (status: ${r.status})`);
  }

  if (!r.resource_ids || r.resource_ids.length === 0) {
    throw new ValidationError("No resources are linked to this room");
  }

  const { count, error: countErr } = await supabaseAdmin
    .from("study_room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (countErr) throw new Error(`Failed to count participants: ${countErr.message}`);
  if ((count ?? 0) < 2) {
    throw new ValidationError(
      "At least 2 participants (host + 1 friend) are required to start",
    );
  }

  const resourceContent = await fetchResourceContent(r.workspace_id, r.resource_ids);

  await generateRoomQuestions(roomId, resourceContent, r.question_count, r.workspace_id);

  const { error: updateErr } = await supabaseAdmin
    .from("study_rooms")
    .update({ status: "in_progress", current_question_order: 0 })
    .eq("id", roomId);

  if (updateErr) throw new Error(`Failed to update room status: ${updateErr.message}`);

  const { data: questions, error: qErr } = await supabaseAdmin
    .from("study_room_questions")
    .select("*")
    .eq("room_id", roomId)
    .order("order_index", { ascending: true })
    .limit(1);

  if (qErr) throw new Error(`Failed to fetch first question: ${qErr.message}`);
  if (!questions || questions.length === 0) throw new Error("No questions found after generation");

  return questions[0] as QuestionRow;
};

// ---------------------------------------------------------------------------
// submitAnswer
// ---------------------------------------------------------------------------

export const submitAnswer = async (
  userId: string,
  roomId: string,
  questionId: string,
  selectedAnswer: string,
): Promise<{ is_correct: boolean; points_earned: number; allConfirmed: boolean }> => {
  const { data: participant } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) throw new ForbiddenError("You are not a participant in this room");

  const { data: question, error: qErr } = await supabaseAdmin
    .from("study_room_questions")
    .select("id, correct_answer")
    .eq("id", questionId)
    .eq("room_id", roomId)
    .single();

  if (qErr || !question) throw new NotFoundError("Question not found in this room");

  const isCorrect = selectedAnswer === question.correct_answer;
  const pointsEarned = isCorrect ? 100 : 0;

  const { error: insertErr } = await supabaseAdmin
    .from("study_room_answers")
    .insert({
      room_id: roomId,
      question_id: questionId,
      user_id: userId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    });

  if (insertErr) {
    if (insertErr.code === "23505") {
      throw new DuplicateAnswerError("Answer already submitted for this question");
    }
    throw new Error(`Failed to save answer: ${insertErr.message}`);
  }

  const { count: participantCount } = await supabaseAdmin
    .from("study_room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  const { count: answeredCount } = await supabaseAdmin
    .from("study_room_answers")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("question_id", questionId);

  const allConfirmed = (answeredCount ?? 0) >= (participantCount ?? 0);

  return { is_correct: isCorrect, points_earned: pointsEarned, allConfirmed };
};

// ---------------------------------------------------------------------------
// nextQuestion
// ---------------------------------------------------------------------------

export const nextQuestion = async (
  userId: string,
  roomId: string,
  currentQuestionId: string,
): Promise<{ completed: boolean; question?: QuestionRow }> => {
  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .select("id, host_id, status, current_question_order")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) throw new NotFoundError("Room not found");
  if (room.host_id !== userId) throw new ForbiddenError("Only the host can advance questions");
  if (room.status !== "in_progress") {
    throw new ValidationError(`Room is not in progress (status: ${room.status})`);
  }

  const { count: participantCount } = await supabaseAdmin
    .from("study_room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  const { count: answeredCount } = await supabaseAdmin
    .from("study_room_answers")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("question_id", currentQuestionId);

  if ((answeredCount ?? 0) < (participantCount ?? 0)) {
    throw new ValidationError("Not all participants have answered the current question");
  }

  const { data: currentQ, error: cqErr } = await supabaseAdmin
    .from("study_room_questions")
    .select("order_index")
    .eq("id", currentQuestionId)
    .eq("room_id", roomId)
    .single();

  if (cqErr || !currentQ) throw new NotFoundError("Current question not found");

  const nextOrderIndex = currentQ.order_index + 1;

  const { data: nextQs, error: nqErr } = await supabaseAdmin
    .from("study_room_questions")
    .select("*")
    .eq("room_id", roomId)
    .eq("order_index", nextOrderIndex)
    .limit(1);

  if (nqErr) throw new Error(`Failed to fetch next question: ${nqErr.message}`);

  if (!nextQs || nextQs.length === 0) {
    await supabaseAdmin
      .from("study_rooms")
      .update({ status: "completed" })
      .eq("id", roomId);

    return { completed: true };
  }

  // Advance current_question_order tracking
  await supabaseAdmin
    .from("study_rooms")
    .update({ current_question_order: nextOrderIndex })
    .eq("id", roomId);

  const next = nextQs[0] as QuestionRow;
  return { completed: false, question: next };
};

// ---------------------------------------------------------------------------
// getCurrentQuestion
// ---------------------------------------------------------------------------

export const getCurrentQuestion = async (
  userId: string,
  roomId: string,
): Promise<CurrentQuestionShape> => {
  // Validate participant access
  const { data: participant } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) throw new ForbiddenError("You are not a participant in this room");

  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .select("status, current_question_order")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) throw new NotFoundError("Room not found");
  if (room.status !== "in_progress") {
    throw new ValidationError(`Room is not in progress (status: ${room.status})`);
  }

  const { data: questions, error: qErr } = await supabaseAdmin
    .from("study_room_questions")
    .select("*")
    .eq("room_id", roomId)
    .eq("order_index", room.current_question_order)
    .limit(1);

  if (qErr) throw new Error(`Failed to fetch current question: ${qErr.message}`);
  if (!questions || questions.length === 0) {
    throw new NotFoundError("No current question found");
  }

  return toCurrentQuestionShape(questions[0] as QuestionRow);
};

// ---------------------------------------------------------------------------
// getRoomResults
// ---------------------------------------------------------------------------

export const getRoomResults = async (
  userId: string,
  roomId: string,
): Promise<RoomResults> => {
  const { data: participant } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) throw new ForbiddenError("You are not a participant in this room");

  const [roomResult, participantsResult, questionsResult, answersResult] =
    await Promise.all([
      supabaseAdmin.from("study_rooms").select("id, title").eq("id", roomId).single(),
      supabaseAdmin
        .from("study_room_participants")
        .select("user_id")
        .eq("room_id", roomId),
      supabaseAdmin
        .from("study_room_questions")
        .select("id, question, options, correct_answer, explanation, order_index")
        .eq("room_id", roomId)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("study_room_answers")
        .select("user_id, question_id, selected_answer, is_correct, points_earned")
        .eq("room_id", roomId),
    ]);

  if (roomResult.error || !roomResult.data) throw new NotFoundError("Room not found");

  const room = roomResult.data as { id: string; title: string };
  const participants = (participantsResult.data ?? []) as { user_id: string }[];
  const questions = (questionsResult.data ?? []) as QuestionRow[];
  const answers = (answersResult.data ?? []) as AnswerRow[];

  const userIds = participants.map((p) => p.user_id);
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string; avatar_url: string | null }) => [
      p.id,
      { full_name: p.full_name, avatar_url: p.avatar_url },
    ]),
  );

  const pointsMap = new Map<string, number>();
  for (const a of answers) {
    pointsMap.set(a.user_id, (pointsMap.get(a.user_id) ?? 0) + a.points_earned);
  }

  const leaderboard: LeaderboardEntry[] = userIds
    .map((uid) => ({
      user_id: uid,
      name: profileMap.get(uid)?.full_name ?? "Unknown",
      avatar_url: profileMap.get(uid)?.avatar_url ?? null,
      points: pointsMap.get(uid) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, i) => ({ ...entry, position: i + 1 }));

  const LETTER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const myWrongAnswers = answers
    .filter((a) => a.user_id === userId && !a.is_correct)
    .map((a): WrongAnswerDetail => {
      const q = questionMap.get(a.question_id);
      const rawOpts = q?.options as Record<string, string> | null | undefined;
      const optionsArray: string[] = rawOpts
        ? [rawOpts.A ?? "", rawOpts.B ?? "", rawOpts.C ?? "", rawOpts.D ?? ""]
        : [];
      return {
        question_number: (q?.order_index ?? 0) + 1,
        question_text: q?.question ?? "",
        options: optionsArray,
        selected_answer: LETTER_TO_INDEX[a.selected_answer] ?? 0,
        correct_answer: LETTER_TO_INDEX[q?.correct_answer ?? "A"] ?? 0,
        explanation: q?.explanation ?? "",
      };
    });

  const myAnswers = answers.filter((a) => a.user_id === userId);
  const myTotalPoints = pointsMap.get(userId) ?? 0;
  const topPoints = leaderboard[0]?.points ?? 0;
  const perfectScore =
    myAnswers.length === questions.length && myAnswers.every((a) => a.is_correct);
  const firstPlace = leaderboard[0]?.user_id === userId && topPoints > 0;
  const participation = myAnswers.length > 0;

  return {
    room_id: room.id,
    room_title: room.title,
    leaderboard,
    wrong_answers: myWrongAnswers,
    badges: buildBadges(userId, perfectScore, firstPlace, participation),
  };
};

// ---------------------------------------------------------------------------
// generateRoomInsights
// ---------------------------------------------------------------------------

export const generateRoomInsights = async (
  userId: string,
  roomId: string,
): Promise<string> => {
  const { data: participant } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) throw new ForbiddenError("You are not a participant in this room");

  return generateInsights(userId, roomId);
};

// ---------------------------------------------------------------------------
// getRoomWithParticipants
// ---------------------------------------------------------------------------

export const getRoomWithParticipants = async (
  userId: string,
  roomId: string,
): Promise<{ room: StudyRoomRow; participants: ParticipantRow[] }> => {
  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) throw new NotFoundError("Room not found");

  const r = room as StudyRoomRow;

  const { data: participant } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant && r.host_id !== userId) {
    throw new ForbiddenError("You do not have access to this room");
  }

  const { data: participants, error: pErr } = await supabaseAdmin
    .from("study_room_participants")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (pErr) throw new Error(`Failed to fetch participants: ${pErr.message}`);

  return {
    room: r,
    participants: (participants ?? []) as ParticipantRow[],
  };
};

// ---------------------------------------------------------------------------
// getActiveInvitations
// Rooms in 'waiting' state where user is a participant but NOT the host
// ---------------------------------------------------------------------------

export const getActiveInvitations = async (
  userId: string,
  workspaceId: string,
): Promise<ActiveInvitationShape[]> => {
  // Get rooms where user is a non-host participant in this workspace
  const { data: participations, error: pErr } = await supabaseAdmin
    .from("study_room_participants")
    .select("room_id, is_host")
    .eq("user_id", userId)
    .eq("is_host", false);

  if (pErr || !participations || participations.length === 0) return [];

  const roomIds = participations.map((p: { room_id: string }) => p.room_id);

  const { data: rooms, error: rErr } = await supabaseAdmin
    .from("study_rooms")
    .select("id, title, invite_method, host_id, created_at, status")
    .in("id", roomIds)
    .eq("workspace_id", workspaceId)
    .eq("status", "waiting")
    .order("created_at", { ascending: false });

  if (rErr || !rooms || rooms.length === 0) return [];

  const hostIds = [...new Set(rooms.map((r: { host_id: string }) => r.host_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .in("id", hostIds);

  const nameMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
  );

  return rooms.map((r: { id: string; title: string; invite_method: InviteMethod; host_id: string; created_at: string }) => ({
    id: r.id,
    room_id: r.id,
    room_title: r.title,
    host_name: nameMap.get(r.host_id) ?? "Unknown",
    invite_method: r.invite_method,
    created_at: r.created_at,
  }));
};

// ---------------------------------------------------------------------------
// getRecentRooms
// Completed rooms where user was a participant (not host) in this workspace
// ---------------------------------------------------------------------------

export const getRecentRooms = async (
  userId: string,
  workspaceId: string,
): Promise<RecentRoomShape[]> => {
  const { data: participations, error: pErr } = await supabaseAdmin
    .from("study_room_participants")
    .select("room_id")
    .eq("user_id", userId);

  if (pErr || !participations || participations.length === 0) return [];

  const roomIds = participations.map((p: { room_id: string }) => p.room_id);

  const { data: rooms, error: rErr } = await supabaseAdmin
    .from("study_rooms")
    .select("id, title, status, created_at, question_count")
    .in("id", roomIds)
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (rErr || !rooms || rooms.length === 0) return [];

  // Fetch participant counts and user scores in parallel
  const completedRoomIds = rooms.map((r: { id: string }) => r.id);

  const [{ data: allParticipants }, { data: allAnswers }] = await Promise.all([
    supabaseAdmin
      .from("study_room_participants")
      .select("room_id, user_id")
      .in("room_id", completedRoomIds),
    supabaseAdmin
      .from("study_room_answers")
      .select("room_id, user_id, points_earned")
      .in("room_id", completedRoomIds)
      .eq("user_id", userId),
  ]);

  const participantCountMap = new Map<string, number>();
  for (const p of (allParticipants ?? []) as { room_id: string }[]) {
    participantCountMap.set(p.room_id, (participantCountMap.get(p.room_id) ?? 0) + 1);
  }

  const scoreMap = new Map<string, number>();
  for (const a of (allAnswers ?? []) as { room_id: string; points_earned: number }[]) {
    scoreMap.set(a.room_id, (scoreMap.get(a.room_id) ?? 0) + a.points_earned);
  }

  return rooms.map((r: { id: string; title: string; status: RoomStatus; created_at: string; question_count: number }) => ({
    id: r.id,
    title: r.title,
    date: r.created_at,
    participant_count: participantCountMap.get(r.id) ?? 0,
    score: scoreMap.get(r.id) ?? 0,
    total_questions: r.question_count,
    status: r.status,
  }));
};

// ---------------------------------------------------------------------------
// getHostedRooms
// Rooms created by this user in this workspace
// ---------------------------------------------------------------------------

export const getHostedRooms = async (
  userId: string,
  workspaceId: string,
): Promise<HostedRoomShape[]> => {
  const { data: rooms, error: rErr } = await supabaseAdmin
    .from("study_rooms")
    .select("id, title, status, created_at")
    .eq("host_id", userId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (rErr || !rooms || rooms.length === 0) return [];

  const roomIds = rooms.map((r: { id: string }) => r.id);

  const { data: allParticipants } = await supabaseAdmin
    .from("study_room_participants")
    .select("room_id")
    .in("room_id", roomIds);

  const participantCountMap = new Map<string, number>();
  for (const p of (allParticipants ?? []) as { room_id: string }[]) {
    participantCountMap.set(p.room_id, (participantCountMap.get(p.room_id) ?? 0) + 1);
  }

  return rooms.map((r: { id: string; title: string; status: RoomStatus; created_at: string }) => ({
    id: r.id,
    title: r.title,
    date: r.created_at,
    participant_count: participantCountMap.get(r.id) ?? 0,
    status: r.status,
  }));
};

// ---------------------------------------------------------------------------
// Domain error classes (used to map to HTTP status codes in the controller)
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class OtpExpiredError extends Error {
  readonly statusCode = 410;
  constructor(message: string) {
    super(message);
    this.name = "OtpExpiredError";
  }
}

export class DuplicateAnswerError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "DuplicateAnswerError";
  }
}
