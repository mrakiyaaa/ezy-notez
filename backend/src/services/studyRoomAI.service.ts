import { createHash } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { callOpenRouter } from "../utils/openRouterClient";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = "google/gemini-flash-1.5";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedQuestion {
  id: string;
  room_id: string;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
  order_index: number;
  created_at: string;
}

interface RawQuestion {
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const hashQuestion = (text: string): string =>
  createHash("sha256").update(text.trim().toLowerCase()).digest("hex");

/** Strip markdown code fences a model may accidentally wrap JSON with. */
const stripFences = (raw: string): string =>
  raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

// ---------------------------------------------------------------------------
// generateRoomQuestions
// ---------------------------------------------------------------------------

/**
 * Generates quiz questions for a study room via OpenRouter and persists them.
 *
 * Steps:
 *  1. Pre-fetch all used question hashes for this workspace.
 *  2. Fetch recent question texts for this workspace (prompt exclusion hint).
 *  3. Call OpenRouter with system + user messages.
 *  4. Parse the JSON array response.
 *  5. SHA-256 hash each question text; discard duplicates.
 *  6. Insert unique questions into study_room_questions.
 *  7. Record their hashes in used_questions.
 *  8. Return the inserted question rows.
 */
export const generateRoomQuestions = async (
  roomId: string,
  resourceContent: string,
  questionCount: number,
  workspaceId: string,
): Promise<GeneratedQuestion[]> => {
  // ── Step 1: fetch all existing hashes for this workspace ──────────────────
  const { data: hashRows, error: hashErr } = await supabaseAdmin
    .from("used_questions")
    .select("question_hash")
    .eq("workspace_id", workspaceId);

  if (hashErr) {
    throw new Error(`Failed to fetch used question hashes: ${hashErr.message}`);
  }

  const usedHashes = new Set(
    (hashRows ?? []).map((r: { question_hash: string }) => r.question_hash),
  );

  // ── Step 2: fetch recent question texts to guide the model ────────────────
  const { data: roomRows } = await supabaseAdmin
    .from("study_rooms")
    .select("id")
    .eq("workspace_id", workspaceId);

  const roomIds = (roomRows ?? []).map((r: { id: string }) => r.id);

  let existingQuestionTexts: string[] = [];
  if (roomIds.length > 0) {
    const { data: qRows } = await supabaseAdmin
      .from("study_room_questions")
      .select("question")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(40);

    existingQuestionTexts = (qRows ?? []).map(
      (q: { question: string }) => q.question,
    );
  }

  const exclusionBlock =
    existingQuestionTexts.length > 0
      ? existingQuestionTexts.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "none";

  // ── Step 3: build prompts ─────────────────────────────────────────────────
  const systemPrompt =
    "You are an academic quiz generator. You generate multiple choice questions " +
    "strictly based on the provided study material. " +
    "Return ONLY a valid JSON array. No markdown, no explanation, no preamble.";

  const userPrompt =
    `Generate exactly ${questionCount} multiple choice questions based on the following study material.\n\n` +
    `Rules:\n` +
    `- Each question must be directly answerable from the material\n` +
    `- Options must be labeled A, B, C, D\n` +
    `- correct_answer must be exactly one of: "A", "B", "C", "D"\n` +
    `- explanation must explain why the correct answer is right and briefly why others are wrong\n` +
    `- Questions must be varied — avoid repeating similar concepts\n` +
    `- Do not generate any of the following questions (already used):\n${exclusionBlock}\n\n` +
    `Return format — JSON array only:\n` +
    `[\n` +
    `  {\n` +
    `    "question": "...",\n` +
    `    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },\n` +
    `    "correct_answer": "A",\n` +
    `    "explanation": "..."\n` +
    `  }\n` +
    `]\n\n` +
    `Study material:\n${resourceContent}`;

  // ── Step 4: call OpenRouter ───────────────────────────────────────────────
  const rawResponse = await callOpenRouter(systemPrompt, userPrompt, MODEL);

  // ── Step 5: parse JSON ────────────────────────────────────────────────────
  const cleaned = stripFences(rawResponse);

  let questions: RawQuestion[];
  try {
    questions = JSON.parse(cleaned);
  } catch (parseErr) {
    console.warn(
      "[studyRoomAI] Failed to parse OpenRouter response — returning empty array.\n",
      (parseErr as Error).message,
      "\nRaw (first 300 chars):",
      cleaned.slice(0, 300),
    );
    return [];
  }

  if (!Array.isArray(questions)) {
    console.warn(
      `[studyRoomAI] OpenRouter response is not a JSON array (got ${typeof questions}) — returning empty array.`,
    );
    return [];
  }

  if (questions.length === 0) {
    console.warn("[studyRoomAI] OpenRouter returned an empty questions array.");
    return [];
  }

  // ── Step 5 cont.: deduplicate by hash ─────────────────────────────────────
  const hashed = questions.map((q) => ({
    ...q,
    hash: hashQuestion(q.question),
  }));

  const unique = hashed.filter((q) => !usedHashes.has(q.hash));

  if (unique.length === 0) {
    console.warn(
      `[studyRoomAI] All ${hashed.length} generated questions were duplicates ` +
        `for workspace=${workspaceId}. Returning empty array.`,
    );
    return [];
  }

  if (unique.length < questionCount) {
    console.warn(
      `[studyRoomAI] Only ${unique.length} of ${questionCount} requested questions ` +
        `were unique after deduplication for workspace=${workspaceId}. ` +
        "Proceeding with available questions.",
    );
  }

  // ── Step 6: insert unique questions ──────────────────────────────────────
  const questionRows = unique.map((q, i) => ({
    room_id: roomId,
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    order_index: i,
  }));

  const { data: inserted, error: qErr } = await supabaseAdmin
    .from("study_room_questions")
    .insert(questionRows)
    .select();

  if (qErr) {
    throw new Error(`Failed to store questions: ${qErr.message}`);
  }

  // ── Step 7: record hashes ─────────────────────────────────────────────────
  const usedRows = unique.map((q) => ({
    workspace_id: workspaceId,
    question_hash: q.hash,
  }));

  const { error: uErr } = await supabaseAdmin
    .from("used_questions")
    .insert(usedRows);

  if (uErr) {
    // Non-fatal: a concurrent insert may have already written some hashes.
    console.warn(
      "[studyRoomAI] Failed to record used_questions hashes:",
      uErr.message,
    );
  }

  // ── Step 8: return ────────────────────────────────────────────────────────
  return (inserted ?? []) as GeneratedQuestion[];
};

// ---------------------------------------------------------------------------
// generateInsights
// ---------------------------------------------------------------------------

interface AnswerJoinRow {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  study_room_questions:
    | { question: string; correct_answer: string; explanation: string }
    | { question: string; correct_answer: string; explanation: string }[]
    | null;
}

/**
 * Generates a personalised weak-topic paragraph for a user based on their
 * incorrect answers in a study room.
 *
 * Never throws — always returns a string.
 * Returns a positive message if the user answered everything correctly.
 * Returns a fallback string if the OpenRouter call fails.
 */
export const generateInsights = async (
  userId: string,
  roomId: string,
): Promise<string> => {
  try {
    // ── Fetch all answers for this user in this room ─────────────────────
    const { data: answers, error: aErr } = await supabaseAdmin
      .from("study_room_answers")
      .select(
        "question_id, selected_answer, is_correct, " +
          "study_room_questions(question, correct_answer, explanation)",
      )
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (aErr) {
      console.error("[studyRoomAI] Failed to fetch answers for insights:", aErr.message);
      return "Unable to generate insights at this time. Please review your incorrect answers above.";
    }

    const allAnswers = (answers ?? []) as unknown as AnswerJoinRow[];
    const wrongAnswers = allAnswers.filter((a) => !a.is_correct);

    // ── All correct ───────────────────────────────────────────────────────
    if (wrongAnswers.length === 0) {
      return "Excellent work! You answered every question correctly. Keep up the great study habits!";
    }

    // ── Build wrong-answer summary for the prompt ─────────────────────────
    const wrongSummary = wrongAnswers
      .map((a) => {
        const q = Array.isArray(a.study_room_questions)
          ? a.study_room_questions[0]
          : a.study_room_questions;
        return (
          `Q: ${q?.question ?? "(unknown)"} | ` +
          `Their answer: ${a.selected_answer} | ` +
          `Correct answer: ${q?.correct_answer ?? "N/A"} | ` +
          `Explanation: ${q?.explanation ?? ""}`
        );
      })
      .join("\n");

    // ── Build prompts ─────────────────────────────────────────────────────
    const systemPrompt =
      "You are an academic learning coach. Analyse a student's quiz performance " +
      "and identify weak areas. Be concise, constructive, and specific. " +
      "Respond in 3-5 sentences only.";

    const userPrompt =
      `A student completed a quiz. Here are the questions they answered incorrectly:\n\n` +
      `${wrongSummary}\n\n` +
      `Identify the weak topics and suggest what the student should revise. ` +
      `Be specific to the subject matter.`;

    // ── Call OpenRouter ───────────────────────────────────────────────────
    const insights = await callOpenRouter(systemPrompt, userPrompt, MODEL);
    return insights;
  } catch (err) {
    console.error("[studyRoomAI] generateInsights failed:", err);
    return "Unable to generate insights at this time. Please review your incorrect answers above.";
  }
};
