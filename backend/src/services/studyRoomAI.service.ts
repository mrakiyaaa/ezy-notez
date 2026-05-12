import { createHash } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { callGemini } from "../utils/geminiClient";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = "gemini-2.5-flash";
const MAX_CHARS = 4000;
const MIN_LINE_WORDS = 8;

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
// Text preprocessing
// ---------------------------------------------------------------------------

const URL_REGEX = /https?:\/\/\S+|www\.\S+/gi;
const NUMERIC_DATE_REGEX =
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/;
const FILE_METADATA_REGEX = /\.(pdf|pptx?|docx?|xlsx?)\b|\b(slide|page)\s*\d+\b/i;
const PURELY_NUMERIC_REGEX = /^\s*[\d\s.,]+\s*$/;
const EXCESS_BLANK_LINES_REGEX = /\n{3,}/g;

const stripUrlsFromLine = (line: string): string =>
  line.replace(URL_REGEX, "").replace(/\s{2,}/g, " ").trim();

const isMetadataLine = (line: string): boolean =>
  PURELY_NUMERIC_REGEX.test(line) ||
  NUMERIC_DATE_REGEX.test(line) ||
  FILE_METADATA_REGEX.test(line) ||
  line.trim().split(/\s+/).filter(Boolean).length < MIN_LINE_WORDS;

const truncateAtSentenceBoundary = (text: string): string => {
  if (text.length <= MAX_CHARS) return text;
  const truncated = text.slice(0, MAX_CHARS);
  const lastEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("?\n"),
    truncated.lastIndexOf("!\n"),
  );
  return lastEnd > 0
    ? truncated.slice(0, lastEnd + 1).trimEnd()
    : truncated.trimEnd();
};

/**
 * Removes metadata noise (dates, page numbers, headers, URLs, file paths)
 * from extracted resource text before it is sent to the LLM, so the model
 * focuses on academic content rather than document formatting artefacts.
 */
export const preprocessText = (text: string): string => {
  const filtered = text
    .split("\n")
    .map(stripUrlsFromLine)
    .filter((line) => !isMetadataLine(line))
    .join("\n");

  const collapsed = filtered.replace(EXCESS_BLANK_LINES_REGEX, "\n\n").trim();

  return truncateAtSentenceBoundary(collapsed);
};

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

/**
 * Extract the first balanced JSON array substring from a model response.
 * Gemini sometimes prepends/appends prose despite the prompt — this lets us
 * recover the array instead of failing JSON.parse.
 */
const extractJsonArray = (raw: string): string => {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return raw;
  return raw.slice(start, end + 1);
};

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

  // ── Step 3: preprocess resource text then build prompts ──────────────────
  const processedContent = preprocessText(resourceContent);

  const systemPrompt =
    "You are an academic quiz generator. You generate multiple choice questions " +
    "strictly based on the provided study material. " +
    "Generate questions about concepts, definitions, processes, and academic content only. " +
    "Do not generate questions about dates, page numbers, file names, or document formatting. " +
    "Return ONLY a valid JSON array. No markdown, no explanation, no preamble.";

  const userPrompt =
    `Generate exactly ${questionCount} multiple choice questions based on the following study material.\n\n` +
    `Rules:\n` +
    `- Each question must be directly answerable from the material\n` +
    `- Generate questions about concepts, definitions, processes, and academic content only\n` +
    `- Do not generate questions about dates, page numbers, file names, or document formatting\n` +
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
    `Study material:\n${processedContent}`;

  // ── Step 4: call Gemini ───────────────────────────────────────────────────
  const rawResponse = await callGemini(systemPrompt, userPrompt, MODEL);

  // ── Step 5: parse JSON ────────────────────────────────────────────────────
  const cleaned = extractJsonArray(stripFences(rawResponse));

  let questions: RawQuestion[];
  try {
    questions = JSON.parse(cleaned);
  } catch (parseErr) {
    console.warn(
      "[studyRoomAI] Failed to parse Gemini response — returning empty array.\n",
      (parseErr as Error).message,
      "\nRaw (first 300 chars):",
      cleaned.slice(0, 300),
    );
    return [];
  }

  if (!Array.isArray(questions)) {
    console.warn(
      `[studyRoomAI] Gemini response is not a JSON array (got ${typeof questions}) — returning empty array.`,
    );
    return [];
  }

  if (questions.length === 0) {
    console.warn("[studyRoomAI] Gemini returned an empty questions array.");
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
 * Returns a fallback string if the Gemini call fails.
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

    // ── Call Gemini ───────────────────────────────────────────────────────
    const insights = await callGemini(systemPrompt, userPrompt, MODEL);
    return insights;
  } catch (err) {
    console.error("[studyRoomAI] generateInsights failed:", err);
    return "Unable to generate insights at this time. Please review your incorrect answers above.";
  }
};
