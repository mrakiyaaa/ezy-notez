import { supabaseAdmin } from "../config/supabase";
import axios from "axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuizStatus = "pending" | "processing" | "ready" | "failed";
export type AttemptStatus = "in_progress" | "completed";
export type QuestionType = "mcq" | "scenario" | "mixed";

export interface QuizRow {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  source_ids: string[];
  question_type: QuestionType;
  question_count: number;
  status: QuizStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: "mcq" | "scenario";
  options: QuestionOption[];
  correct_option_id: string;
  explanation: string;
  topic_tag: string;
  position: number;
}

export interface QuizAnswer {
  question_id: string;
  selected_option_id: string;
  is_correct: boolean;
  answered_at: string;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  user_id: string;
  status: AttemptStatus;
  answers: QuizAnswer[];
  score: number | null;
  total: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface QuizWithQuestions extends QuizRow {
  questions: QuizQuestionRow[];
}

export interface QuizWithAttempt extends QuizRow {
  attempt: QuizAttemptRow | null;
}

interface ResourceTextRow {
  id: string;
  extracted_text: string | null;
}

interface FastAPIQuestion {
  question_text: string;
  question_type: "mcq" | "scenario";
  options: QuestionOption[];
  correct_option_id: string;
  explanation: string;
  topic_tag: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUIZ_ML_SERVICE_URL =
  process.env.QUIZ_ML_SERVICE_URL || "http://localhost:8001";

const ML_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowISO = (): string => new Date().toISOString();

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Unknown error";

const updateQuizStatus = async (
  quizId: string,
  status: QuizStatus,
  errorMsg?: string,
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("quizzes")
    .update({ status, error_message: errorMsg ?? null, updated_at: nowISO() })
    .eq("id", quizId);

  if (error) {
    console.error(`[quiz] Failed to set status=${status} for quiz=${quizId}:`, error.message);
  }
};

// ---------------------------------------------------------------------------
// Resource text retrieval (mirrors flashcard.service.ts pattern)
// ---------------------------------------------------------------------------

const fetchResourceText = async (
  workspaceId: string,
  resourceIds: string[],
): Promise<{ text: string; usableIds: string[] }> => {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .in("id", resourceIds)
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
    .not("extracted_text", "is", null);

  if (error) throw new Error(`Failed to fetch resources: ${error.message}`);

  const usable = ((data ?? []) as ResourceTextRow[]).filter(
    (r) => r.extracted_text && r.extracted_text.trim().length > 0,
  );

  if (usable.length === 0) {
    throw new Error("None of the selected resources have extracted text");
  }

  const text = usable
    .map((r) => r.extracted_text!.trim().replace(/\0/g, ""))
    .join("\n\n");

  return { text, usableIds: usable.map((r) => r.id) };
};

// ---------------------------------------------------------------------------
// FastAPI communication
// ---------------------------------------------------------------------------

const callMLService = async (
  text: string,
  questionType: QuestionType,
  questionCount: number,
): Promise<FastAPIQuestion[]> => {
  try {
    const response = await axios.post<{ questions: FastAPIQuestion[] }>(
      `${QUIZ_ML_SERVICE_URL}/generate-quiz`,
      { text, question_type: questionType, question_count: questionCount },
      { timeout: ML_TIMEOUT_MS },
    );
    return response.data.questions;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const detail = err.response
        ? `ML service returned ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : `Cannot reach ML service at ${QUIZ_ML_SERVICE_URL} — ${err.message}`;
      console.error(`[quiz] ML service call failed:`, detail);
      throw new Error(detail);
    }
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Background pipeline
// ---------------------------------------------------------------------------

const runQuizPipeline = async (
  quizId: string,
  text: string,
  questionType: QuestionType,
  questionCount: number,
): Promise<void> => {
  await updateQuizStatus(quizId, "processing");

  try {
    const mlQuestions = await callMLService(text, questionType, questionCount);

    if (!mlQuestions || mlQuestions.length === 0) {
      throw new Error("ML service returned no questions.");
    }

    const rows = mlQuestions.map((q, i) => ({
      quiz_id: quizId,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_option_id: q.correct_option_id,
      explanation: q.explanation,
      topic_tag: q.topic_tag,
      position: i,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("quiz_questions")
      .insert(rows);

    if (insertErr) throw new Error(`Failed to store questions: ${insertErr.message}`);

    // Update question_count to actual number returned
    const { error: updateErr } = await supabaseAdmin
      .from("quizzes")
      .update({
        status: "ready",
        question_count: mlQuestions.length,
        error_message: null,
        updated_at: nowISO(),
      })
      .eq("id", quizId);

    if (updateErr) throw new Error(`Failed to update quiz: ${updateErr.message}`);
  } catch (err) {
    console.error(`[quiz] Pipeline failed for quiz=${quizId}:`, errorMessage(err));
    await updateQuizStatus(quizId, "failed", errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// CRUD — Quizzes
// ---------------------------------------------------------------------------

export const generateQuiz = async (
  workspaceId: string,
  userId: string,
  resourceIds: string[],
  questionType: QuestionType,
  questionCount: number,
): Promise<QuizRow> => {
  const { text, usableIds } = await fetchResourceText(workspaceId, resourceIds);

  const TYPE_LABELS: Record<QuestionType, string> = {
    mcq: "Multiple Choice",
    scenario: "Scenario",
    mixed: "Mixed",
  };

  const title = `${TYPE_LABELS[questionType]} Quiz (${questionCount} questions)`;

  const { data: quiz, error } = await supabaseAdmin
    .from("quizzes")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      title,
      source_ids: usableIds,
      question_type: questionType,
      question_count: questionCount,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create quiz: ${error.message}`);

  // Fire-and-forget
  runQuizPipeline(quiz.id, text, questionType, questionCount).catch((err) => {
    console.error("[quiz] Background pipeline error:", errorMessage(err));
  });

  return quiz as QuizRow;
};

export const getWorkspaceQuizzes = async (
  workspaceId: string,
  userId: string,
): Promise<QuizWithAttempt[]> => {
  const { data: quizzes, error } = await supabaseAdmin
    .from("quizzes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch quizzes: ${error.message}`);

  const quizList = (quizzes ?? []) as QuizRow[];

  // Fetch latest attempt per quiz for this user
  const results: QuizWithAttempt[] = await Promise.all(
    quizList.map(async (quiz) => {
      const { data: attempts } = await supabaseAdmin
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1);

      const attempt =
        attempts && attempts.length > 0
          ? (attempts[0] as QuizAttemptRow)
          : null;

      return { ...quiz, attempt };
    }),
  );

  return results;
};

export const getQuizById = async (quizId: string): Promise<QuizRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (error) return null;
  return data as QuizRow;
};

export const getQuizWithQuestions = async (
  quizId: string,
  includeCorrectAnswer = false,
): Promise<QuizWithQuestions | null> => {
  const quiz = await getQuizById(quizId);
  if (!quiz) return null;

  const { data: questions, error } = await supabaseAdmin
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  if (error) throw new Error(`Failed to fetch questions: ${error.message}`);

  let qList = (questions ?? []) as QuizQuestionRow[];

  if (!includeCorrectAnswer) {
    // Strip correct_option_id to prevent cheating during an active attempt
    qList = qList.map(({ correct_option_id: _stripped, ...rest }) => ({
      ...rest,
      correct_option_id: "",
    }));
  }

  return { ...quiz, questions: qList };
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("quizzes")
    .delete()
    .eq("id", quizId);

  if (error) throw new Error(`Failed to delete quiz: ${error.message}`);
};

// ---------------------------------------------------------------------------
// CRUD — Attempts
// ---------------------------------------------------------------------------

export const getOrCreateAttempt = async (
  quizId: string,
  userId: string,
): Promise<QuizAttemptRow> => {
  // Look for an existing in-progress attempt first
  const { data: existing } = await supabaseAdmin
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as QuizAttemptRow;
  }

  // Create a fresh attempt
  const { data, error } = await supabaseAdmin
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: userId,
      status: "in_progress",
      answers: [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create attempt: ${error.message}`);
  return data as QuizAttemptRow;
};

export const submitAnswer = async (
  attemptId: string,
  questionId: string,
  selectedOptionId: string,
): Promise<QuizAttemptRow> => {
  // Fetch current attempt
  const { data: attempt, error: attemptErr } = await supabaseAdmin
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptErr || !attempt) throw new Error("Attempt not found");

  // Look up correct answer server-side
  const { data: question, error: qErr } = await supabaseAdmin
    .from("quiz_questions")
    .select("correct_option_id")
    .eq("id", questionId)
    .single();

  if (qErr || !question) throw new Error("Question not found");

  const isCorrect = selectedOptionId === question.correct_option_id;

  const currentAnswers: QuizAnswer[] = (attempt as QuizAttemptRow).answers ?? [];

  // Replace existing answer for this question or append
  const newAnswer: QuizAnswer = {
    question_id: questionId,
    selected_option_id: selectedOptionId,
    is_correct: isCorrect,
    answered_at: nowISO(),
  };

  const updatedAnswers = [
    ...currentAnswers.filter((a) => a.question_id !== questionId),
    newAnswer,
  ];

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("quiz_attempts")
    .update({ answers: updatedAnswers })
    .eq("id", attemptId)
    .select()
    .single();

  if (updateErr) throw new Error(`Failed to save answer: ${updateErr.message}`);
  return updated as QuizAttemptRow;
};

export const completeAttempt = async (
  attemptId: string,
): Promise<QuizAttemptRow> => {
  const { data: attempt, error: attemptErr } = await supabaseAdmin
    .from("quiz_attempts")
    .select("*, quizzes(question_count)")
    .eq("id", attemptId)
    .single();

  if (attemptErr || !attempt) throw new Error("Attempt not found");

  const answers: QuizAnswer[] = (attempt as QuizAttemptRow).answers ?? [];
  const correctCount = answers.filter((a) => a.is_correct).length;
  const total = (attempt as QuizAttemptRow & { quizzes: { question_count: number } }).quizzes
    ?.question_count ?? answers.length;

  const { data: updated, error } = await supabaseAdmin
    .from("quiz_attempts")
    .update({
      status: "completed",
      score: correctCount,
      total,
      completed_at: nowISO(),
    })
    .eq("id", attemptId)
    .select()
    .single();

  if (error) throw new Error(`Failed to complete attempt: ${error.message}`);
  return updated as QuizAttemptRow;
};

export const getAttemptResults = async (
  quizId: string,
  attemptId: string,
): Promise<{
  attempt: QuizAttemptRow;
  quiz: QuizRow;
  questions: QuizQuestionRow[];
  topic_breakdown: {
    topic_tag: string;
    total_questions: number;
    correct_answers: number;
    accuracy_percentage: number;
  }[];
} | null> => {
  const [quizWithQ, attemptResult] = await Promise.all([
    getQuizWithQuestions(quizId, /* includeCorrectAnswer */ true),
    supabaseAdmin
      .from("quiz_attempts")
      .select("*")
      .eq("id", attemptId)
      .single(),
  ]);

  if (!quizWithQ || attemptResult.error || !attemptResult.data) return null;

  const attempt = attemptResult.data as QuizAttemptRow;
  const { questions, ...quiz } = quizWithQ;

  // Build topic breakdown
  const topicMap = new Map<string, { total: number; correct: number }>();

  for (const q of questions) {
    const tag = q.topic_tag || "General";
    const entry = topicMap.get(tag) ?? { total: 0, correct: 0 };
    const answer = attempt.answers.find((a) => a.question_id === q.id);
    entry.total += 1;
    if (answer?.is_correct) entry.correct += 1;
    topicMap.set(tag, entry);
  }

  const topic_breakdown = Array.from(topicMap.entries()).map(([topic_tag, v]) => ({
    topic_tag,
    total_questions: v.total,
    correct_answers: v.correct,
    accuracy_percentage: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  return { attempt, quiz, questions, topic_breakdown };
};
