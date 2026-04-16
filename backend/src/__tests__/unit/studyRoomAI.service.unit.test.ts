/**
 * studyRoomAI.service unit tests
 *
 * Mocks supabaseAdmin and axios so that no real I/O occurs.
 *
 * generateRoomQuestions:
 *   - deduplicates questions already in used_questions
 *   - returns [] gracefully on JSON parse failure (no throw)
 *   - proceeds with fewer questions when deduplication reduces the count
 *
 * generateInsights:
 *   - returns a positive string without calling OpenRouter when all answers correct
 *   - returns the fallback string (never throws) when OpenRouter call fails
 */

jest.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), refreshSession: jest.fn() },
  },
}));

jest.mock("axios");

import { supabaseAdmin } from "../../config/supabase";
import axios from "axios";
import { makeQueryChain } from "../helpers/queryChain";
import {
  generateRoomQuestions,
  generateInsights,
} from "../../services/studyRoomAI.service";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;

/** Returns a mock OpenRouter chat-completion response shape. */
const openRouterResponse = (content: string) => ({
  data: { choices: [{ message: { content } }] },
});

/** A minimal valid JSON array of one question. */
const ONE_QUESTION_JSON = JSON.stringify([
  {
    question: "What is photosynthesis?",
    options: { A: "Cell division", B: "Light to energy", C: "Respiration", D: "Digestion" },
    correct_answer: "B",
    explanation: "Photosynthesis converts light into chemical energy.",
  },
]);

/** Two-question JSON array with distinct questions. */
const TWO_QUESTION_JSON = JSON.stringify([
  {
    question: "What is photosynthesis?",
    options: { A: "Cell division", B: "Light to energy", C: "Respiration", D: "Digestion" },
    correct_answer: "B",
    explanation: "Photosynthesis converts light into chemical energy.",
  },
  {
    question: "What organelle performs photosynthesis?",
    options: { A: "Mitochondria", B: "Nucleus", C: "Chloroplast", D: "Ribosome" },
    correct_answer: "C",
    explanation: "Chloroplasts contain chlorophyll for light absorption.",
  },
]);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.OPENROUTER_API_KEY = "test-key-unit";
  (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
});

// ---------------------------------------------------------------------------
// generateRoomQuestions
// ---------------------------------------------------------------------------

describe("generateRoomQuestions", () => {
  it("inserts and returns unique questions when none are duplicates", async () => {
    const insertedRows = [
      {
        id: "q-1",
        room_id: "room-1",
        question: "What is photosynthesis?",
        options: { A: "Cell division", B: "Light to energy", C: "Respiration", D: "Digestion" },
        correct_answer: "B",
        explanation: "Photosynthesis converts light into chemical energy.",
        order_index: 0,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions") return makeQueryChain([]); // no used hashes
      if (table === "study_rooms") return makeQueryChain([{ id: "room-1" }]);
      if (table === "study_room_questions") return makeQueryChain(insertedRows);
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse(ONE_QUESTION_JSON));

    const result = await generateRoomQuestions("room-1", "Study material text.", 1, "ws-1");

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("What is photosynthesis?");
  });

  it("deduplicates questions already present in used_questions", async () => {
    // Pre-hash of "what is photosynthesis?" (lowercased, trimmed SHA-256)
    // We cannot compute the exact hash here, so instead we force the model to
    // return the same text that is already in used_questions by making
    // the mockFrom for used_questions return a hash that will match.
    //
    // Strategy: return TWO questions from OpenRouter; mark the first one's
    // hash as already used. Expect only the second to be inserted.

    // We need the real sha256 of the first question text.
    const { createHash } = await import("crypto");
    const usedHash = createHash("sha256")
      .update("what is photosynthesis?")
      .digest("hex");

    const insertedRows = [
      {
        id: "q-2",
        room_id: "room-1",
        question: "What organelle performs photosynthesis?",
        options: { A: "Mitochondria", B: "Nucleus", C: "Chloroplast", D: "Ribosome" },
        correct_answer: "C",
        explanation: "Chloroplasts contain chlorophyll for light absorption.",
        order_index: 0,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions")
        return makeQueryChain([{ question_hash: usedHash }]);
      if (table === "study_rooms") return makeQueryChain([{ id: "room-1" }]);
      if (table === "study_room_questions") return makeQueryChain(insertedRows);
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse(TWO_QUESTION_JSON));

    const result = await generateRoomQuestions("room-1", "Study material text.", 2, "ws-1");

    // Only the non-duplicate question should be returned
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("What organelle performs photosynthesis?");
  });

  it("returns [] gracefully when OpenRouter returns invalid JSON (no throw)", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions") return makeQueryChain([]);
      if (table === "study_rooms") return makeQueryChain([]);
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse("This is not JSON at all !!!"));

    await expect(
      generateRoomQuestions("room-1", "Study material.", 2, "ws-1"),
    ).resolves.toEqual([]);
  });

  it("returns [] gracefully when OpenRouter returns a JSON object (not an array)", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions") return makeQueryChain([]);
      if (table === "study_rooms") return makeQueryChain([]);
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse('{"error": "oops"}'));

    await expect(
      generateRoomQuestions("room-1", "Study material.", 2, "ws-1"),
    ).resolves.toEqual([]);
  });

  it("returns [] when OpenRouter returns an empty JSON array", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions") return makeQueryChain([]);
      if (table === "study_rooms") return makeQueryChain([]);
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse("[]"));

    await expect(
      generateRoomQuestions("room-1", "Study material.", 2, "ws-1"),
    ).resolves.toEqual([]);
  });

  it("returns [] when all generated questions are duplicates", async () => {
    const { createHash } = await import("crypto");
    const usedHash = createHash("sha256")
      .update("what is photosynthesis?")
      .digest("hex");

    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions")
        return makeQueryChain([{ question_hash: usedHash }]);
      if (table === "study_rooms") return makeQueryChain([]);
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse(ONE_QUESTION_JSON));

    await expect(
      generateRoomQuestions("room-1", "Study material.", 1, "ws-1"),
    ).resolves.toEqual([]);
  });

  it("proceeds with fewer questions when deduplication reduces count below target", async () => {
    // OpenRouter returns 2 questions; only the second is unique
    const { createHash } = await import("crypto");
    const usedHash = createHash("sha256")
      .update("what is photosynthesis?")
      .digest("hex");

    const insertedRows = [
      {
        id: "q-2",
        room_id: "room-1",
        question: "What organelle performs photosynthesis?",
        options: { A: "Mitochondria", B: "Nucleus", C: "Chloroplast", D: "Ribosome" },
        correct_answer: "C",
        explanation: "Chloroplasts contain chlorophyll for light absorption.",
        order_index: 0,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions")
        return makeQueryChain([{ question_hash: usedHash }]);
      if (table === "study_rooms") return makeQueryChain([{ id: "room-1" }]);
      if (table === "study_room_questions") return makeQueryChain(insertedRows);
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse(TWO_QUESTION_JSON));

    // Requested 2, but only 1 is unique — should still resolve (not throw)
    const result = await generateRoomQuestions("room-1", "Study material.", 2, "ws-1");
    expect(result).toHaveLength(1);
  });

  it("throws when fetching used_questions hashes fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "used_questions")
        return makeQueryChain(null, { message: "DB connection error" });
      return makeQueryChain(null);
    });

    mockAxiosPost.mockResolvedValue(openRouterResponse(ONE_QUESTION_JSON));

    await expect(
      generateRoomQuestions("room-1", "Study material.", 1, "ws-1"),
    ).rejects.toThrow("Failed to fetch used question hashes");
  });
});

// ---------------------------------------------------------------------------
// generateInsights
// ---------------------------------------------------------------------------

describe("generateInsights", () => {
  it("returns a positive message without calling OpenRouter when all answers are correct", async () => {
    const answers = [
      {
        question_id: "q-1",
        selected_answer: "B",
        is_correct: true,
        study_room_questions: {
          question: "What is photosynthesis?",
          correct_answer: "B",
          explanation: "Converts light to energy.",
        },
      },
      {
        question_id: "q-2",
        selected_answer: "C",
        is_correct: true,
        study_room_questions: {
          question: "What organelle performs photosynthesis?",
          correct_answer: "C",
          explanation: "Chloroplasts.",
        },
      },
    ];

    mockFrom.mockReturnValue(makeQueryChain(answers));

    const result = await generateInsights("user-1", "room-1");

    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(result).toMatch(/excellent|correct|great/i);
  });

  it("returns OpenRouter insights string for users with incorrect answers", async () => {
    const answers = [
      {
        question_id: "q-1",
        selected_answer: "A",
        is_correct: false,
        study_room_questions: {
          question: "What is photosynthesis?",
          correct_answer: "B",
          explanation: "Converts light to energy.",
        },
      },
    ];

    mockFrom.mockReturnValue(makeQueryChain(answers));
    mockAxiosPost.mockResolvedValue(
      openRouterResponse(
        "You should revise the topic of photosynthesis, particularly light-dependent reactions.",
      ),
    );

    const result = await generateInsights("user-1", "room-1");

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(result).toContain("photosynthesis");
  });

  it("returns fallback string and never throws when OpenRouter call fails", async () => {
    const answers = [
      {
        question_id: "q-1",
        selected_answer: "A",
        is_correct: false,
        study_room_questions: {
          question: "What is photosynthesis?",
          correct_answer: "B",
          explanation: "Converts light to energy.",
        },
      },
    ];

    mockFrom.mockReturnValue(makeQueryChain(answers));
    mockAxiosPost.mockRejectedValue(new Error("Network unreachable"));

    await expect(generateInsights("user-1", "room-1")).resolves.toMatch(
      /unable to generate insights/i,
    );
  });

  it("returns fallback string and never throws when Supabase answers fetch fails", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "permission denied" }));

    await expect(generateInsights("user-1", "room-1")).resolves.toMatch(
      /unable to generate insights/i,
    );
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("handles answers where study_room_questions is an array (Supabase join edge case)", async () => {
    // Supabase sometimes returns joined rows as an array even for a single FK
    const answers = [
      {
        question_id: "q-1",
        selected_answer: "A",
        is_correct: false,
        study_room_questions: [
          {
            question: "What is photosynthesis?",
            correct_answer: "B",
            explanation: "Converts light to energy.",
          },
        ],
      },
    ];

    mockFrom.mockReturnValue(makeQueryChain(answers));
    mockAxiosPost.mockResolvedValue(
      openRouterResponse("Revise photosynthesis."),
    );

    const result = await generateInsights("user-1", "room-1");

    // Should not throw; should call OpenRouter with the first element of the array
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
