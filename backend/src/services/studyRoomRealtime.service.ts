import { supabaseAdmin } from "../config/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionBroadcast {
  id: string;
  question: string;
  options: unknown;
  order_index: number;
}

// ---------------------------------------------------------------------------
// Internal fire-and-forget send helper
// ---------------------------------------------------------------------------

/**
 * Subscribe to the channel, send the event, then remove the channel.
 * Uses ack:true so the channel is only torn down after the server confirms
 * delivery. A 5 s timeout guards against a subscribe that never completes.
 * Never throws — errors are logged as warnings.
 */
const send = (
  roomId: string,
  event: string,
  payload: Record<string, unknown>,
): void => {
  const ch = supabaseAdmin.channel(`study-room:${roomId}`, {
    config: { broadcast: { ack: true } },
  });

  const timeout = setTimeout(() => {
    console.warn(
      `[studyRoomRealtime] send timed out — room=${roomId} event=${event}`,
    );
    supabaseAdmin.removeChannel(ch).catch(() => undefined);
  }, 5_000);

  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      ch
        .send({ type: "broadcast", event, payload })
        .catch((err: unknown) => {
          console.warn(
            `[studyRoomRealtime] send failed — room=${roomId} event=${event}:`,
            err,
          );
        })
        .finally(() => {
          clearTimeout(timeout);
          supabaseAdmin.removeChannel(ch).catch(() => undefined);
        });
    }
  });
};

// ---------------------------------------------------------------------------
// Broadcast functions
// ---------------------------------------------------------------------------

/**
 * Broadcast when a user joins the lobby.
 * Looks up the user's display name from profiles.
 * Async because of the profile lookup; safe to call without await (fire-and-forget).
 */
export const broadcastParticipantJoined = async (
  roomId: string,
  userId: string,
  isHost: boolean,
): Promise<void> => {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  send(roomId, "participant:joined", {
    userId,
    displayName: profile?.full_name ?? "Unknown",
    isHost,
    joinedAt: new Date().toISOString(),
  });
};

/**
 * Broadcast when a participant disconnects.
 */
export const broadcastParticipantDisconnected = (
  roomId: string,
  userId: string,
): void => {
  send(roomId, "participant:disconnected", { userId });
};

/**
 * Broadcast when the host starts the quiz.
 * Fetches total question count from the DB.
 * Async; safe to call without await.
 */
export const broadcastQuizStarted = async (
  roomId: string,
  firstQuestion: QuestionBroadcast,
): Promise<void> => {
  const { count } = await supabaseAdmin
    .from("study_room_questions")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  send(roomId, "quiz:started", {
    question: {
      id: firstQuestion.id,
      // Map DB column "question" → frontend field "question_text"
      question_text: firstQuestion.question,
      question_number: firstQuestion.order_index + 1,
      options: firstQuestion.options,
      order_index: firstQuestion.order_index,
    },
    totalQuestions: count ?? 0,
  });
};

/**
 * Broadcast when a participant submits an answer.
 * When allConfirmed=true, includes the correct answer letter and explanation
 * so the frontend can reveal results immediately without a separate fetch.
 * Async; safe to call without await.
 */
export const broadcastAnswerConfirmed = async (
  roomId: string,
  questionId: string,
  userId: string,
  allConfirmed: boolean,
): Promise<void> => {
  let correctAnswer: string | undefined;
  let explanation: string | undefined;

  if (allConfirmed) {
    const { data: q } = await supabaseAdmin
      .from("study_room_questions")
      .select("correct_answer, explanation")
      .eq("id", questionId)
      .single();
    correctAnswer = q?.correct_answer ?? undefined;
    explanation = q?.explanation ?? undefined;
  }

  send(roomId, "answer:confirmed", {
    questionId,
    userId,
    allConfirmed,
    ...(allConfirmed && { correctAnswer, explanation }),
  });
};

/**
 * Broadcast when the host advances to the next question.
 * Fetches the outgoing (previous) question's correct_answer and explanation.
 * Async; safe to call without await.
 */
export const broadcastNextQuestion = async (
  roomId: string,
  nextQuestion: QuestionBroadcast,
  previousQuestionId: string,
): Promise<void> => {
  const { data: prevQ } = await supabaseAdmin
    .from("study_room_questions")
    .select("correct_answer, explanation")
    .eq("id", previousQuestionId)
    .single();

  send(roomId, "question:next", {
    question: {
      id: nextQuestion.id,
      // Map DB column "question" → frontend field "question_text"
      question_text: nextQuestion.question,
      question_number: nextQuestion.order_index + 1,
      options: nextQuestion.options,
      order_index: nextQuestion.order_index,
    },
    previousAnswer: {
      correct_answer: prevQ?.correct_answer ?? "",
      explanation: prevQ?.explanation ?? "",
    },
  });
};

/**
 * Broadcast when all questions have been answered and the room ends.
 */
export const broadcastRoomEnded = (roomId: string): void => {
  send(roomId, "room:ended", { roomId });
};
