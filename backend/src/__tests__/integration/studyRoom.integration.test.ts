/**
 * Study Room route integration tests
 *
 * Fires real HTTP requests against the Express app with mocked Supabase,
 * auth middleware, axios (OpenRouter), realtime broadcasts, and email.
 */

// ---------------------------------------------------------------------------
// Module mocks  (must be BEFORE any imports)
// ---------------------------------------------------------------------------

jest.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), refreshSession: jest.fn() },
  },
}));

jest.mock("../../middleware/auth.middleware", () => ({
  authenticateUser: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
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

// Silence broadcasts — we only verify HTTP responses, not Supabase Realtime
jest.mock("../../services/studyRoomRealtime.service", () => ({
  broadcastParticipantJoined: jest.fn().mockResolvedValue(undefined),
  broadcastQuizStarted: jest.fn().mockResolvedValue(undefined),
  broadcastAnswerConfirmed: jest.fn(),
  broadcastNextQuestion: jest.fn().mockResolvedValue(undefined),
  broadcastRoomEnded: jest.fn(),
}));

// Silence email sending
jest.mock("../../services/email.service", () => ({
  sendStudyRoomInvite: jest.fn().mockResolvedValue(undefined),
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

const ROOM_ROW = {
  id: "room-1",
  workspace_id: "ws-1",
  host_id: "test-user-id",
  title: "Test Room",
  description: null,
  status: "waiting",
  invite_method: "otp",
  otp_code: "123456",
  otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  question_count: 20,
  resource_ids: ["res-1"],
  current_question_order: 0,
  created_at: new Date().toISOString(),
};

const QUESTION_ROW = {
  id: "q-1",
  room_id: "room-1",
  question: "What is photosynthesis?",
  options: { A: "Cell division", B: "Light to energy", C: "Respiration", D: "Digestion" },
  correct_answer: "B",
  explanation: "Converts light to chemical energy.",
  order_index: 0,
  created_at: new Date().toISOString(),
};

const PARTICIPANT_ROW = {
  id: "p-1",
  room_id: "room-1",
  user_id: "test-user-id",
  is_host: true,
  joined_at: new Date().toISOString(),
};

const openRouterResponse = (content: string) => ({
  data: { candidates: [{ content: { parts: [{ text: content }] } }] },
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key-integration";
  (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

// ---------------------------------------------------------------------------
// POST /api/study-rooms
// ---------------------------------------------------------------------------

describe("POST /api/study-rooms", () => {
  const validBody = {
    workspace_id: "ws-1",
    title: "My Study Room",
    description: "A test room",
    question_count: 20,
    resource_ids: ["res-1"],
    invite_method: "otp",
  };

  it("returns 201 with the created room for OTP invite method", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "study_rooms") return makeQueryChain(ROOM_ROW);
      if (table === "study_room_participants") return makeQueryChain(null);
      return makeQueryChain(null);
    });

    const res = await request(app).post("/api/study-rooms").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Test Room");
    expect(res.body.data.invite_method).toBe("otp");
  });

  it("returns 201 and sends email invites when invite_method is email", async () => {
    const roomWithEmail = { ...ROOM_ROW, invite_method: "email", otp_code: null };

    mockFrom.mockImplementation((table: string) => {
      if (table === "study_rooms") return makeQueryChain(roomWithEmail);
      if (table === "study_room_participants") return makeQueryChain(null);
      if (table === "study_room_invites")
        return makeQueryChain([{ email: "friend@example.com", token: "inv-token-1" }]);
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms")
      .send({
        ...validBody,
        invite_method: "email",
        emails: ["friend@example.com"],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invite_method).toBe("email");
  });

  it("returns 400 when workspace_id is missing", async () => {
    const { workspace_id: _omit, ...body } = validBody;
    const res = await request(app).post("/api/study-rooms").send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("workspace_id");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/study-rooms")
      .send({ ...validBody, title: "" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("title");
  });

  it("returns 400 when question_count is below minimum (20)", async () => {
    const res = await request(app)
      .post("/api/study-rooms")
      .send({ ...validBody, question_count: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("question_count");
  });

  it("returns 400 when resource_ids is empty", async () => {
    const res = await request(app)
      .post("/api/study-rooms")
      .send({ ...validBody, resource_ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("resource_ids");
  });

  it("returns 400 when invite_method is invalid", async () => {
    const res = await request(app)
      .post("/api/study-rooms")
      .send({ ...validBody, invite_method: "link" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("invite_method");
  });

  it("returns 400 when invite_method is email but emails array is missing", async () => {
    const res = await request(app)
      .post("/api/study-rooms")
      .send({ ...validBody, invite_method: "email" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("emails");
  });
});

// ---------------------------------------------------------------------------
// POST /api/study-rooms/join-by-code
// ---------------------------------------------------------------------------

describe("POST /api/study-rooms/join-by-code", () => {
  it("returns 200 with the room when the OTP code is valid", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "study_rooms") return makeQueryChain([ROOM_ROW]);
      if (table === "study_room_participants") return makeQueryChain(null); // not already joined
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/join-by-code")
      .send({ otp_code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.room.id).toBe("room-1");
  });

  it("returns 400 when otp_code is missing", async () => {
    const res = await request(app)
      .post("/api/study-rooms/join-by-code")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("otp_code");
  });

  it("returns 404 when no active room exists with that code", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "study_rooms") return makeQueryChain([]);
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/join-by-code")
      .send({ otp_code: "000000" });

    expect(res.status).toBe(404);
  });

  it("returns 410 when the OTP has expired", async () => {
    const expiredRoom = {
      ...ROOM_ROW,
      otp_expires_at: new Date(Date.now() - 1000).toISOString(), // expired
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "study_rooms") return makeQueryChain([expiredRoom]);
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/join-by-code")
      .send({ otp_code: "123456" });

    expect(res.status).toBe(410);
  });
});

// ---------------------------------------------------------------------------
// POST /api/study-rooms/invite/:token/accept
// ---------------------------------------------------------------------------

describe("POST /api/study-rooms/invite/:token/accept", () => {
  it("returns 200 with room_id on successful invite acceptance", async () => {
    const invite = { id: "inv-1", room_id: "room-1", status: "pending" };
    const room = { id: "room-1", status: "waiting" };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_room_invites" && call === 1) return makeQueryChain(invite);
      if (table === "study_rooms") return makeQueryChain(room);
      if (table === "study_room_participants") return makeQueryChain(null); // not already joined
      if (table === "study_room_invites") return makeQueryChain(null); // update
      return makeQueryChain(null);
    });

    const res = await request(app).post("/api/study-rooms/invite/valid-token/accept");

    expect(res.status).toBe(200);
    expect(res.body.data.room_id).toBe("room-1");
  });

  it("returns 404 when the invite token does not exist", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    const res = await request(app).post("/api/study-rooms/invite/bad-token/accept");

    expect(res.status).toBe(404);
  });

  it("returns 400 when the invite has already been used", async () => {
    mockFrom.mockReturnValue(makeQueryChain({ id: "inv-1", room_id: "room-1", status: "accepted" }));

    const res = await request(app).post("/api/study-rooms/invite/used-token/accept");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("already been used");
  });
});

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/start
// ---------------------------------------------------------------------------

describe("POST /api/study-rooms/:roomId/start", () => {
  it("returns 200 with firstQuestion when room starts successfully", async () => {
    const resource = { id: "res-1", extracted_text: "Photosynthesis lecture content." };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_rooms" && call === 1) return makeQueryChain(ROOM_ROW); // fetch room
      if (table === "study_room_participants" && call === 2)
        return makeQueryChain(null, null, 2); // participant count ≥ 2
      if (table === "resources") return makeQueryChain([resource]);
      if (table === "used_questions") return makeQueryChain([]); // no used hashes
      if (table === "study_room_questions" && call <= 7)
        return makeQueryChain([QUESTION_ROW]); // AI inserts + fetch first
      if (table === "study_rooms") return makeQueryChain(null); // status update
      return makeQueryChain([QUESTION_ROW]);
    });

    mockAxiosPost.mockResolvedValue(
      openRouterResponse(
        JSON.stringify([
          {
            question: QUESTION_ROW.question,
            options: QUESTION_ROW.options,
            correct_answer: QUESTION_ROW.correct_answer,
            explanation: QUESTION_ROW.explanation,
          },
        ]),
      ),
    );

    const res = await request(app).post("/api/study-rooms/room-1/start");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("firstQuestion");
  });

  it("returns 403 when a non-host tries to start the room", async () => {
    const roomOtherHost = { ...ROOM_ROW, host_id: "someone-else" };
    mockFrom.mockReturnValue(makeQueryChain(roomOtherHost));

    const res = await request(app).post("/api/study-rooms/room-1/start");

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("host");
  });

  it("returns 400 when the room is not in waiting status", async () => {
    const inProgressRoom = { ...ROOM_ROW, status: "in_progress" };
    mockFrom.mockReturnValue(makeQueryChain(inProgressRoom));

    const res = await request(app).post("/api/study-rooms/room-1/start");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("cannot be started");
  });

  it("returns 400 when fewer than 2 participants are in the room", async () => {
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_rooms") return makeQueryChain(ROOM_ROW);
      if (table === "study_room_participants")
        return makeQueryChain(null, null, 1); // only 1 participant
      return makeQueryChain(null);
    });

    const res = await request(app).post("/api/study-rooms/room-1/start");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("2 participants");
  });
});

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/answer
// ---------------------------------------------------------------------------

describe("POST /api/study-rooms/:roomId/answer", () => {
  it("returns 200 with is_correct and points_earned for a correct answer", async () => {
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_room_participants" && call === 1)
        return makeQueryChain(PARTICIPANT_ROW); // participant exists
      if (table === "study_room_questions")
        return makeQueryChain({ id: "q-1", correct_answer: "B" });
      if (table === "study_room_answers" && call === 3) return makeQueryChain(null); // insert OK
      if (table === "study_room_participants") return makeQueryChain(null, null, 2); // count
      if (table === "study_room_answers") return makeQueryChain(null, null, 2); // answered count
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/room-1/answer")
      .send({ question_id: "q-1", selected_answer: "B" });

    expect(res.status).toBe(200);
    expect(res.body.data.is_correct).toBe(true);
    expect(res.body.data.points_earned).toBe(100);
  });

  it("returns 200 with is_correct=false and 0 points for a wrong answer", async () => {
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_room_participants" && call === 1)
        return makeQueryChain(PARTICIPANT_ROW);
      if (table === "study_room_questions")
        return makeQueryChain({ id: "q-1", correct_answer: "B" });
      if (table === "study_room_answers" && call === 3) return makeQueryChain(null);
      if (table === "study_room_participants") return makeQueryChain(null, null, 2);
      if (table === "study_room_answers") return makeQueryChain(null, null, 1);
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/room-1/answer")
      .send({ question_id: "q-1", selected_answer: "A" });

    expect(res.status).toBe(200);
    expect(res.body.data.is_correct).toBe(false);
    expect(res.body.data.points_earned).toBe(0);
  });

  it("returns 400 when question_id is missing", async () => {
    const res = await request(app)
      .post("/api/study-rooms/room-1/answer")
      .send({ selected_answer: "B" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("question_id");
  });

  it("returns 400 when selected_answer is missing", async () => {
    const res = await request(app)
      .post("/api/study-rooms/room-1/answer")
      .send({ question_id: "q-1" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("selected_answer");
  });

  it("returns 403 when user is not a participant", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "study_room_participants") return makeQueryChain(null); // not found
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/room-1/answer")
      .send({ question_id: "q-1", selected_answer: "B" });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/study-rooms/:roomId/next
// ---------------------------------------------------------------------------

describe("POST /api/study-rooms/:roomId/next", () => {
  const inProgressRoom = {
    ...ROOM_ROW,
    status: "in_progress",
    current_question_order: 0,
  };

  it("returns 200 with the next question when it exists", async () => {
    const nextQuestion = { ...QUESTION_ROW, id: "q-2", order_index: 1 };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_rooms" && call === 1) return makeQueryChain(inProgressRoom);
      if (table === "study_room_participants") return makeQueryChain(null, null, 2);
      if (table === "study_room_answers") return makeQueryChain(null, null, 2);
      if (table === "study_room_questions" && call === 4)
        return makeQueryChain({ order_index: 0 }); // currentQ
      if (table === "study_room_questions") return makeQueryChain([nextQuestion]); // nextQs
      if (table === "study_rooms") return makeQueryChain(null); // update order
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/room-1/next")
      .send({ current_question_id: "q-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(false);
    expect(res.body.data.question).toBeDefined();
  });

  it("returns 200 with completed=true when there are no more questions", async () => {
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_rooms" && call === 1) return makeQueryChain(inProgressRoom);
      if (table === "study_room_participants") return makeQueryChain(null, null, 2);
      if (table === "study_room_answers") return makeQueryChain(null, null, 2);
      if (table === "study_room_questions" && call === 4)
        return makeQueryChain({ order_index: 0 }); // currentQ
      if (table === "study_room_questions") return makeQueryChain([]); // no next question → completed
      if (table === "study_rooms") return makeQueryChain(null); // status update
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/study-rooms/room-1/next")
      .send({ current_question_id: "q-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(true);
  });

  it("returns 400 when current_question_id is missing", async () => {
    const res = await request(app).post("/api/study-rooms/room-1/next").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("current_question_id");
  });

  it("returns 403 when a non-host tries to advance the question", async () => {
    const otherHostRoom = { ...inProgressRoom, host_id: "someone-else" };
    mockFrom.mockReturnValue(makeQueryChain(otherHostRoom));

    const res = await request(app)
      .post("/api/study-rooms/room-1/next")
      .send({ current_question_id: "q-1" });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /api/study-rooms/:roomId/results
// ---------------------------------------------------------------------------

describe("GET /api/study-rooms/:roomId/results", () => {
  it("returns 200 with leaderboard, wrong_answers, and badges", async () => {
    const participant = { id: "p-1" };
    const room = { id: "room-1", title: "Test Room" };
    const participants = [{ user_id: "test-user-id" }];
    const questions = [
      {
        id: "q-1",
        question: "What is photosynthesis?",
        options: { A: "Cell division", B: "Light to energy", C: "Respiration", D: "Digestion" },
        correct_answer: "B",
        explanation: "Converts light to energy.",
        order_index: 0,
      },
    ];
    const answers = [
      {
        user_id: "test-user-id",
        question_id: "q-1",
        selected_answer: "B",
        is_correct: true,
        points_earned: 100,
      },
    ];
    const profiles = [
      { id: "test-user-id", full_name: "Test User", avatar_url: null },
    ];

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_room_participants" && call === 1)
        return makeQueryChain(participant); // auth check
      if (table === "study_rooms") return makeQueryChain(room);
      if (table === "study_room_participants") return makeQueryChain(participants);
      if (table === "study_room_questions") return makeQueryChain(questions);
      if (table === "study_room_answers") return makeQueryChain(answers);
      if (table === "profiles") return makeQueryChain(profiles);
      return makeQueryChain(null);
    });

    const res = await request(app).get("/api/study-rooms/room-1/results");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("leaderboard");
    expect(res.body.data).toHaveProperty("wrong_answers");
    expect(res.body.data).toHaveProperty("badges");
    expect(res.body.data.leaderboard).toHaveLength(1);
    expect(res.body.data.leaderboard[0].points).toBe(100);
    // Perfect score with the only question answered correctly
    expect(res.body.data.wrong_answers).toHaveLength(0);
  });

  it("returns 403 when user is not a participant", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "study_room_participants") return makeQueryChain(null); // not found
      return makeQueryChain(null);
    });

    const res = await request(app).get("/api/study-rooms/room-1/results");

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /api/study-rooms/:roomId/current-question
// ---------------------------------------------------------------------------

describe("GET /api/study-rooms/:roomId/current-question", () => {
  it("returns 200 with the current question shape", async () => {
    const inProgressRoom = { ...ROOM_ROW, status: "in_progress", current_question_order: 0 };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_room_participants") return makeQueryChain(PARTICIPANT_ROW);
      if (table === "study_rooms") return makeQueryChain(inProgressRoom);
      if (table === "study_room_questions") return makeQueryChain([QUESTION_ROW]);
      return makeQueryChain(null);
    });

    const res = await request(app).get("/api/study-rooms/room-1/current-question");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("question_text");
    expect(res.body.data).toHaveProperty("question_number");
    expect(res.body.data.question_number).toBe(1);
  });

  it("returns 400 when the room is not in_progress", async () => {
    const waitingRoom = { ...ROOM_ROW, status: "waiting" };

    mockFrom.mockImplementation((table: string) => {
      if (table === "study_room_participants") return makeQueryChain(PARTICIPANT_ROW);
      if (table === "study_rooms") return makeQueryChain(waitingRoom);
      return makeQueryChain(null);
    });

    const res = await request(app).get("/api/study-rooms/room-1/current-question");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("not in progress");
  });
});

// ---------------------------------------------------------------------------
// GET /api/study-rooms/invitations
// ---------------------------------------------------------------------------

describe("GET /api/study-rooms/invitations", () => {
  it("returns 200 with active invitations for a workspace", async () => {
    const participations = [{ room_id: "room-1", is_host: false }];
    const rooms = [
      {
        id: "room-1",
        title: "Test Room",
        invite_method: "otp",
        host_id: "host-user",
        created_at: new Date().toISOString(),
        status: "waiting",
      },
    ];
    const profiles = [{ id: "host-user", full_name: "Host User" }];

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_room_participants") return makeQueryChain(participations);
      if (table === "study_rooms") return makeQueryChain(rooms);
      if (table === "profiles") return makeQueryChain(profiles);
      return makeQueryChain(null);
    });

    const res = await request(app).get("/api/study-rooms/invitations?workspace_id=ws-1");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].room_title).toBe("Test Room");
    expect(res.body.data[0].host_name).toBe("Host User");
  });

  it("returns 400 when workspace_id query param is missing", async () => {
    const res = await request(app).get("/api/study-rooms/invitations");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("workspace_id");
  });
});

// ---------------------------------------------------------------------------
// GET /api/study-rooms/recent
// ---------------------------------------------------------------------------

describe("GET /api/study-rooms/recent", () => {
  it("returns 200 with recent completed rooms for a user", async () => {
    const participations = [{ room_id: "room-1" }];
    const rooms = [
      {
        id: "room-1",
        title: "Test Room",
        status: "completed",
        created_at: new Date().toISOString(),
        question_count: 20,
      },
    ];
    const allParticipants = [{ room_id: "room-1", user_id: "test-user-id" }];
    const allAnswers = [{ room_id: "room-1", user_id: "test-user-id", points_earned: 100 }];

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "study_room_participants" && call === 1) return makeQueryChain(participations);
      if (table === "study_rooms") return makeQueryChain(rooms);
      if (table === "study_room_participants") return makeQueryChain(allParticipants);
      if (table === "study_room_answers") return makeQueryChain(allAnswers);
      return makeQueryChain(null);
    });

    const res = await request(app).get("/api/study-rooms/recent?workspace_id=ws-1");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].score).toBe(100);
  });

  it("returns 400 when workspace_id is missing", async () => {
    const res = await request(app).get("/api/study-rooms/recent");

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/study-rooms/hosted
// ---------------------------------------------------------------------------

describe("GET /api/study-rooms/hosted", () => {
  it("returns 200 with rooms hosted by the user", async () => {
    const rooms = [
      {
        id: "room-1",
        title: "My Room",
        status: "completed",
        created_at: new Date().toISOString(),
      },
    ];
    const allParticipants = [{ room_id: "room-1" }];

    mockFrom.mockImplementation((table: string) => {
      if (table === "study_rooms") return makeQueryChain(rooms);
      if (table === "study_room_participants") return makeQueryChain(allParticipants);
      return makeQueryChain(null);
    });

    const res = await request(app).get("/api/study-rooms/hosted?workspace_id=ws-1");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].participant_count).toBe(1);
  });

  it("returns 400 when workspace_id is missing", async () => {
    const res = await request(app).get("/api/study-rooms/hosted");

    expect(res.status).toBe(400);
  });
});
