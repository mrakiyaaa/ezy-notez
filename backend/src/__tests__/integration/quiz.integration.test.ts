/**
 * Quiz route integration tests
 *
 * Fires real HTTP requests against the Express app with mocked Supabase,
 * auth middleware, and axios (FastAPI ML service).
 */

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), refreshSession: jest.fn() },
  },
}));

jest.mock("../../middleware/auth.middleware", () => ({
  authenticateUser: (req: import("express").Request, _res: import("express").Response, next: import("express").NextFunction) => {
    req.user = { id: "test-user-id" } as import("@supabase/supabase-js").User;
    next();
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

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import request from "supertest";
import axios from "axios";
import { supabaseAdmin } from "../../config/supabase";
import { makeQueryChain } from "../helpers/queryChain";
import { createTestApp } from "../helpers/createTestApp";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;
const app = createTestApp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuizRow(overrides = {}) {
  return {
    id: "quiz-1",
    workspace_id: "ws-1",
    user_id: "test-user-id",
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
    user_id: "test-user-id",
    status: "in_progress",
    answers: [],
    score: null,
    total: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

function makeQuestion(overrides = {}) {
  return {
    id: "q-1",
    quiz_id: "quiz-1",
    question_text: "What is machine learning?",
    question_type: "mcq",
    options: [
      { id: "opt-A", label: "A", text: "A subset of AI" },
      { id: "opt-B", label: "B", text: "A database" },
      { id: "opt-C", label: "C", text: "An OS" },
      { id: "opt-D", label: "D", text: "A network protocol" },
    ],
    correct_option_id: "opt-A",
    explanation: "ML is a subset of AI.",
    topic_tag: "Machine Learning",
    position: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// POST /api/quiz/generate
// ---------------------------------------------------------------------------

describe("POST /api/quiz/generate", () => {
  const validBody = {
    workspace_id: "ws-1",
    resource_ids: ["res-1"],
    question_type: "mcq",
    question_count: 5,
  };

  it("returns 201 with a pending quiz object when inputs are valid", async () => {
    // Arrange
    const resource = { id: "res-1", extracted_text: "ML lecture content about supervised learning." };
    const quiz = makeQuizRow();

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([resource]);
      if (table === "quizzes") return makeQueryChain(quiz);
      return makeQueryChain(null); // background pipeline DB calls
    });

    mockAxiosPost.mockResolvedValue({ data: { questions: [] } }); // pipeline fires and-forget

    // Act
    const res = await request(app).post("/api/quiz/generate").send(validBody);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.question_type).toBe("mcq");
  });

  it("returns 400 when question_type is invalid", async () => {
    // Act
    const res = await request(app)
      .post("/api/quiz/generate")
      .send({ ...validBody, question_type: "essay" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("question_type");
  });

  it("returns 400 when question_count is out of range", async () => {
    // Act
    const res = await request(app)
      .post("/api/quiz/generate")
      .send({ ...validBody, question_count: 25 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("question_count");
  });

  it("returns 400 when resource_ids is empty", async () => {
    // Act
    const res = await request(app)
      .post("/api/quiz/generate")
      .send({ ...validBody, resource_ids: [] });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("resource_ids");
  });

  it("returns 400 when workspace_id is missing", async () => {
    // Act
    const { workspace_id: _omit, ...incomplete } = validBody;
    const res = await request(app).post("/api/quiz/generate").send(incomplete);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("workspace_id");
  });
});

// ---------------------------------------------------------------------------
// GET /api/quiz/workspace/:workspaceId
// ---------------------------------------------------------------------------

describe("GET /api/quiz/workspace/:workspaceId", () => {
  it("returns 200 with an array of quizzes with attempt data", async () => {
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
    const res = await request(app).get("/api/quiz/workspace/ws-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].attempt.score).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// GET /api/quiz/:quizId (with questions, no correct answer)
// ---------------------------------------------------------------------------

describe("GET /api/quiz/:quizId", () => {
  it("returns 200 with quiz and questions, correct_option_id stripped", async () => {
    // Arrange
    const quiz = makeQuizRow({ status: "ready" });
    const question = makeQuestion();

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quizzes") return makeQueryChain(quiz);
      if (table === "quiz_questions") return makeQueryChain([question]);
      return makeQueryChain(null);
    });

    // Act
    const res = await request(app).get("/api/quiz/quiz-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.questions).toHaveLength(1);
    expect(res.body.data.questions[0].correct_option_id).toBe("");
  });

  it("returns 404 when quiz does not exist", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act
    const res = await request(app).get("/api/quiz/non-existent");

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("not found");
  });
});

// ---------------------------------------------------------------------------
// POST /api/quiz/:quizId/attempt
// ---------------------------------------------------------------------------

describe("POST /api/quiz/:quizId/attempt", () => {
  it("returns 200 with an in_progress attempt when quiz is ready", async () => {
    // Arrange
    const quiz = makeQuizRow({ status: "ready" });
    const attempt = makeAttemptRow();

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quizzes") return makeQueryChain(quiz);
      if (table === "quiz_attempts" && call === 2) return makeQueryChain([]); // no existing
      if (table === "quiz_attempts" && call === 3) return makeQueryChain(attempt); // insert
      return makeQueryChain(null);
    });

    // Act
    const res = await request(app).post("/api/quiz/quiz-1/attempt");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("in_progress");
  });

  it("returns 409 when quiz is not yet ready", async () => {
    // Arrange
    const quiz = makeQuizRow({ status: "processing" });
    mockFrom.mockReturnValue(makeQueryChain(quiz));

    // Act
    const res = await request(app).post("/api/quiz/quiz-1/attempt");

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("not ready");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/quiz/attempt/:attemptId/answer
// ---------------------------------------------------------------------------

describe("PATCH /api/quiz/attempt/:attemptId/answer", () => {
  it("returns 200 with the updated attempt after recording a correct answer", async () => {
    // Arrange
    const attempt = makeAttemptRow({ answers: [] });
    const question = { correct_option_id: "opt-A" };
    const updated = {
      ...attempt,
      answers: [{ question_id: "q-1", selected_option_id: "opt-A", is_correct: true }],
    };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quiz_attempts" && call === 1) return makeQueryChain(attempt);
      if (table === "quiz_questions") return makeQueryChain(question);
      if (table === "quiz_attempts") return makeQueryChain(updated);
      return makeQueryChain(null);
    });

    // Act
    const res = await request(app)
      .patch("/api/quiz/attempt/attempt-1/answer")
      .send({ question_id: "q-1", selected_option_id: "opt-A" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.answers[0].is_correct).toBe(true);
  });

  it("returns 400 when question_id is missing", async () => {
    // Act
    const res = await request(app)
      .patch("/api/quiz/attempt/attempt-1/answer")
      .send({ selected_option_id: "opt-A" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("question_id");
  });

  it("returns 400 when selected_option_id is missing", async () => {
    // Act
    const res = await request(app)
      .patch("/api/quiz/attempt/attempt-1/answer")
      .send({ question_id: "q-1" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("selected_option_id");
  });
});

// ---------------------------------------------------------------------------
// POST /api/quiz/attempt/:attemptId/complete
// ---------------------------------------------------------------------------

describe("POST /api/quiz/attempt/:attemptId/complete", () => {
  it("returns 200 with a completed attempt including score and total", async () => {
    // Arrange
    const answers = [
      { question_id: "q-1", selected_option_id: "opt-A", is_correct: true },
      { question_id: "q-2", selected_option_id: "opt-B", is_correct: true },
      { question_id: "q-3", selected_option_id: "opt-C", is_correct: false },
    ];
    const attemptWithJoin = {
      ...makeAttemptRow({ answers }),
      quizzes: { question_count: 5 },
    };
    const completed = makeAttemptRow({ status: "completed", score: 2, total: 5, answers });

    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeQueryChain(attemptWithJoin);
      return makeQueryChain(completed);
    });

    // Act
    const res = await request(app).post("/api/quiz/attempt/attempt-1/complete");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.score).toBe(2);
    expect(res.body.data.total).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// GET /api/quiz/:quizId/attempt/:attemptId/results
// ---------------------------------------------------------------------------

describe("GET /api/quiz/:quizId/attempt/:attemptId/results", () => {
  it("returns 200 with attempt, quiz, questions, and topic_breakdown", async () => {
    // Arrange
    const quiz = makeQuizRow({ status: "ready" });
    const questions = [
      makeQuestion({ topic_tag: "ML" }),
    ];
    const attempt = makeAttemptRow({
      status: "completed",
      answers: [{ question_id: "q-1", selected_option_id: "opt-A", is_correct: true }],
    });

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "quizzes") return makeQueryChain(quiz);
      if (table === "quiz_questions") return makeQueryChain(questions);
      if (table === "quiz_attempts") return makeQueryChain(attempt);
      return makeQueryChain(null);
    });

    // Act
    const res = await request(app).get("/api/quiz/quiz-1/attempt/attempt-1/results");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("attempt");
    expect(res.body.data).toHaveProperty("topic_breakdown");
    expect(res.body.data.topic_breakdown[0].topic_tag).toBe("ML");
    expect(res.body.data.topic_breakdown[0].accuracy_percentage).toBe(100);
  });

  it("returns 404 when quiz or attempt does not exist", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act
    const res = await request(app).get("/api/quiz/non-existent/attempt/bad-attempt/results");

    // Assert
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/quiz/:quizId
// ---------------------------------------------------------------------------

describe("DELETE /api/quiz/:quizId", () => {
  it("returns 200 on successful deletion", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const res = await request(app).delete("/api/quiz/quiz-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });
});
