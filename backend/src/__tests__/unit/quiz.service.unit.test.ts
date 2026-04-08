/**
 * quiz.service unit tests
 *
 * Mocks supabaseAdmin and axios to test each exported service function.
 */

jest.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), refreshSession: jest.fn() },
  },
}));

jest.mock("axios", () => ({
  post: jest.fn(),
  isAxiosError: jest.fn().mockReturnValue(false),
  default: {
    post: jest.fn(),
    isAxiosError: jest.fn().mockReturnValue(false),
  },
}));

import { supabaseAdmin } from "../../config/supabase";
import axios from "axios";
import { makeQueryChain } from "../helpers/queryChain";
import {
  generateQuiz,
  getWorkspaceQuizzes,
  getQuizById,
  getQuizWithQuestions,
  deleteQuiz,
  getOrCreateAttempt,
  submitAnswer,
  completeAttempt,
  getAttemptResults,
} from "../../services/quiz.service";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuizRow(overrides = {}) {
  return {
    id: "quiz-1",
    workspace_id: "ws-1",
    user_id: "user-1",
    title: "MCQ Quiz (5 questions)",
    source_ids: ["res-1"],
    question_type: "mcq",
    question_count: 5,
    status: "pending",
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeAttemptRow(overrides = {}) {
  return {
    id: "attempt-1",
    quiz_id: "quiz-1",
    user_id: "user-1",
    status: "in_progress",
    answers: [],
    score: null,
    total: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateQuiz
// ---------------------------------------------------------------------------

describe("generateQuiz", () => {
  it("inserts a pending quiz row and returns it immediately", async () => {
    // Arrange
    const resource = { id: "res-1", extracted_text: "Machine learning lecture notes." };
    const quiz = makeQuizRow();

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([resource]);
      if (table === "quizzes") return makeQueryChain(quiz);
      return makeQueryChain(null); // background pipeline calls
    });

    // Background ML call — return empty so pipeline fails gracefully (fire-and-forget)
    mockAxiosPost.mockResolvedValue({ data: { questions: [] } });

    // Act
    const result = await generateQuiz("ws-1", "user-1", ["res-1"], "mcq", 5);

    // Assert
    expect(result.id).toBe("quiz-1");
    expect(result.status).toBe("pending");
  });

  it("throws when no resources have extracted text", async () => {
    // Arrange — resources with null text
    mockFrom.mockReturnValue(makeQueryChain([{ id: "res-1", extracted_text: null }]));

    // Act & Assert
    await expect(generateQuiz("ws-1", "user-1", ["res-1"], "mcq", 5)).rejects.toThrow(
      "None of the selected resources have extracted text",
    );
  });

  it("throws when resources fetch returns a Supabase error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "table not found" }));

    // Act & Assert
    await expect(generateQuiz("ws-1", "user-1", ["res-1"], "mcq", 5)).rejects.toThrow(
      "Failed to fetch resources",
    );
  });
});

// ---------------------------------------------------------------------------
// getWorkspaceQuizzes
// ---------------------------------------------------------------------------

describe("getWorkspaceQuizzes", () => {
  it("returns quizzes with latest attempt attached per quiz", async () => {
    // Arrange
    const quiz = makeQuizRow({ status: "ready" });
    const attempt = makeAttemptRow({ status: "completed", score: 4, total: 5 });

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quizzes") return makeQueryChain([quiz]);
      if (table === "quiz_attempts") return makeQueryChain([attempt]);
      return makeQueryChain(null);
    });

    // Act
    const result = await getWorkspaceQuizzes("ws-1", "user-1");

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].attempt?.score).toBe(4);
  });

  it("attaches null attempt when no attempt exists for a quiz", async () => {
    // Arrange
    const quiz = makeQuizRow({ status: "ready" });

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quizzes") return makeQueryChain([quiz]);
      if (table === "quiz_attempts") return makeQueryChain([]);
      return makeQueryChain(null);
    });

    // Act
    const result = await getWorkspaceQuizzes("ws-1", "user-1");

    // Assert
    expect(result[0].attempt).toBeNull();
  });

  it("throws when quizzes fetch fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "connection error" }));

    // Act & Assert
    await expect(getWorkspaceQuizzes("ws-1", "user-1")).rejects.toThrow("Failed to fetch quizzes");
  });
});

// ---------------------------------------------------------------------------
// getQuizById
// ---------------------------------------------------------------------------

describe("getQuizById", () => {
  it("returns the quiz row when found", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(makeQuizRow()));

    // Act
    const result = await getQuizById("quiz-1");

    // Assert
    expect(result?.id).toBe("quiz-1");
  });

  it("returns null when quiz is not found", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "row not found" }));

    // Act
    const result = await getQuizById("non-existent");

    // Assert
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getQuizWithQuestions
// ---------------------------------------------------------------------------

describe("getQuizWithQuestions", () => {
  const questions = [
    {
      id: "q-1",
      quiz_id: "quiz-1",
      question_text: "What is ML?",
      correct_option_id: "opt-correct",
      topic_tag: "ML",
      position: 0,
    },
  ];

  it("strips correct_option_id when includeCorrectAnswer is false", async () => {
    // Arrange
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (call === 1) return makeQueryChain(makeQuizRow({ status: "ready" })); // quizzes
      if (table === "quiz_questions") return makeQueryChain(questions);
      return makeQueryChain(null);
    });

    // Act
    const result = await getQuizWithQuestions("quiz-1", false);

    // Assert
    expect(result?.questions[0].correct_option_id).toBe("");
  });

  it("includes correct_option_id when includeCorrectAnswer is true", async () => {
    // Arrange
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (call === 1) return makeQueryChain(makeQuizRow({ status: "ready" }));
      if (table === "quiz_questions") return makeQueryChain(questions);
      return makeQueryChain(null);
    });

    // Act
    const result = await getQuizWithQuestions("quiz-1", true);

    // Assert
    expect(result?.questions[0].correct_option_id).toBe("opt-correct");
  });

  it("returns null when quiz does not exist", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act
    const result = await getQuizWithQuestions("non-existent");

    // Assert
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteQuiz
// ---------------------------------------------------------------------------

describe("deleteQuiz", () => {
  it("resolves without error on successful delete", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act & Assert
    await expect(deleteQuiz("quiz-1")).resolves.toBeUndefined();
  });

  it("throws when Supabase delete fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "cannot delete" }));

    // Act & Assert
    await expect(deleteQuiz("quiz-1")).rejects.toThrow("Failed to delete quiz");
  });
});

// ---------------------------------------------------------------------------
// getOrCreateAttempt
// ---------------------------------------------------------------------------

describe("getOrCreateAttempt", () => {
  it("returns the existing in-progress attempt when one exists", async () => {
    // Arrange
    const existing = makeAttemptRow();

    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeQueryChain([existing]); // existing attempts query
      return makeQueryChain(null);
    });

    // Act
    const result = await getOrCreateAttempt("quiz-1", "user-1");

    // Assert
    expect(result.id).toBe("attempt-1");
    expect(result.status).toBe("in_progress");
  });

  it("creates and returns a new attempt when none exist", async () => {
    // Arrange
    const newAttempt = makeAttemptRow({ id: "attempt-new" });

    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeQueryChain([]); // no existing
      return makeQueryChain(newAttempt); // INSERT
    });

    // Act
    const result = await getOrCreateAttempt("quiz-1", "user-1");

    // Assert
    expect(result.id).toBe("attempt-new");
    expect(result.status).toBe("in_progress");
  });
});

// ---------------------------------------------------------------------------
// submitAnswer
// ---------------------------------------------------------------------------

describe("submitAnswer", () => {
  it("records a correct answer when selected option matches correct_option_id", async () => {
    // Arrange
    const attempt = makeAttemptRow({ answers: [] });
    const question = { correct_option_id: "opt-A" };
    const updatedAttempt = {
      ...attempt,
      answers: [
        {
          question_id: "q-1",
          selected_option_id: "opt-A",
          is_correct: true,
          answered_at: new Date().toISOString(),
        },
      ],
    };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quiz_attempts" && call === 1) return makeQueryChain(attempt); // fetch attempt
      if (table === "quiz_questions") return makeQueryChain(question); // fetch question
      if (table === "quiz_attempts" && call === 3) return makeQueryChain(updatedAttempt); // update
      return makeQueryChain(null);
    });

    // Act
    const result = await submitAnswer("attempt-1", "q-1", "opt-A");

    // Assert
    expect(result.answers[0].is_correct).toBe(true);
  });

  it("records an incorrect answer when selected option does not match", async () => {
    // Arrange
    const attempt = makeAttemptRow({ answers: [] });
    const question = { correct_option_id: "opt-A" };
    const updatedAttempt = {
      ...attempt,
      answers: [
        {
          question_id: "q-1",
          selected_option_id: "opt-B",
          is_correct: false,
          answered_at: new Date().toISOString(),
        },
      ],
    };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quiz_attempts" && call === 1) return makeQueryChain(attempt);
      if (table === "quiz_questions") return makeQueryChain(question);
      if (table === "quiz_attempts" && call === 3) return makeQueryChain(updatedAttempt);
      return makeQueryChain(null);
    });

    // Act
    const result = await submitAnswer("attempt-1", "q-1", "opt-B");

    // Assert
    expect(result.answers[0].is_correct).toBe(false);
  });

  it("throws when attempt is not found", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act & Assert
    await expect(submitAnswer("bad-attempt", "q-1", "opt-A")).rejects.toThrow("Attempt not found");
  });
});

// ---------------------------------------------------------------------------
// completeAttempt
// ---------------------------------------------------------------------------

describe("completeAttempt", () => {
  it("calculates score correctly and marks attempt as completed", async () => {
    // Arrange
    const answers = [
      { question_id: "q-1", selected_option_id: "opt-A", is_correct: true, answered_at: "" },
      { question_id: "q-2", selected_option_id: "opt-B", is_correct: false, answered_at: "" },
      { question_id: "q-3", selected_option_id: "opt-C", is_correct: true, answered_at: "" },
    ];
    const attempt = {
      ...makeAttemptRow({ answers }),
      quizzes: { question_count: 5 },
    };
    const completedAttempt = {
      ...makeAttemptRow({ status: "completed", score: 2, total: 5, answers }),
    };

    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeQueryChain(attempt); // fetch attempt with quizzes join
      return makeQueryChain(completedAttempt); // update
    });

    // Act
    const result = await completeAttempt("attempt-1");

    // Assert
    expect(result.status).toBe("completed");
    expect(result.score).toBe(2);
    expect(result.total).toBe(5);
  });

  it("throws when attempt is not found", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act & Assert
    await expect(completeAttempt("bad-attempt")).rejects.toThrow("Attempt not found");
  });
});

// ---------------------------------------------------------------------------
// getAttemptResults — topic breakdown
// ---------------------------------------------------------------------------

describe("getAttemptResults", () => {
  it("builds topic_breakdown with correct accuracy percentages", async () => {
    // Arrange
    const quiz = makeQuizRow({ status: "ready" });
    const questions = [
      { id: "q-1", quiz_id: "quiz-1", correct_option_id: "opt-A", topic_tag: "ML", position: 0 },
      { id: "q-2", quiz_id: "quiz-1", correct_option_id: "opt-B", topic_tag: "ML", position: 1 },
      { id: "q-3", quiz_id: "quiz-1", correct_option_id: "opt-C", topic_tag: "DL", position: 2 },
    ];
    const answers = [
      { question_id: "q-1", selected_option_id: "opt-A", is_correct: true },
      { question_id: "q-2", selected_option_id: "opt-X", is_correct: false },
      { question_id: "q-3", selected_option_id: "opt-C", is_correct: true },
    ];
    const attempt = makeAttemptRow({ status: "completed", answers });

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quizzes" && call === 1) return makeQueryChain(quiz);
      if (table === "quiz_questions") return makeQueryChain(questions);
      if (table === "quiz_attempts") return makeQueryChain(attempt);
      return makeQueryChain(null);
    });

    // Act
    const result = await getAttemptResults("quiz-1", "attempt-1");

    // Assert
    expect(result).not.toBeNull();
    const mlBreakdown = result!.topic_breakdown.find((t) => t.topic_tag === "ML");
    const dlBreakdown = result!.topic_breakdown.find((t) => t.topic_tag === "DL");

    expect(mlBreakdown?.total_questions).toBe(2);
    expect(mlBreakdown?.correct_answers).toBe(1);
    expect(mlBreakdown?.accuracy_percentage).toBe(50);

    expect(dlBreakdown?.total_questions).toBe(1);
    expect(dlBreakdown?.correct_answers).toBe(1);
    expect(dlBreakdown?.accuracy_percentage).toBe(100);
  });

  it("returns null when quiz does not exist", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act
    const result = await getAttemptResults("non-existent", "attempt-1");

    // Assert
    expect(result).toBeNull();
  });
});
