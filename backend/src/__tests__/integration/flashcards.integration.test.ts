/**
 * Flashcards route integration tests
 *
 * Fires real HTTP requests against the Express app with mocked Supabase,
 * auth middleware, and child_process (Python flashcard generator).
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

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import request from "supertest";
import { spawn } from "child_process";
import { supabaseAdmin } from "../../config/supabase";
import { makeQueryChain } from "../helpers/queryChain";
import { createMockProcess } from "../helpers/mockProcess";
import { createTestApp } from "../helpers/createTestApp";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockSpawn = spawn as jest.Mock;
const app = createTestApp();

// ---------------------------------------------------------------------------
// POST /api/flashcards/generate
// ---------------------------------------------------------------------------

describe("POST /api/flashcards/generate", () => {
  const validBody = {
    workspace_id: "ws-1",
    resource_ids: ["res-1"],
    topic: "Biology",
    card_count: 10,
  };

  const validCards = JSON.stringify([
    { front: "What is DNA?", back: "Deoxyribonucleic acid" },
    { front: "What is RNA?", back: "Ribonucleic acid" },
  ]);

  it("returns 201 with a pending flashcard set row", async () => {
    // Arrange
    const resource = { id: "res-1", extracted_text: "Biology lecture notes on DNA and RNA." };
    const setRow = {
      id: "set-new",
      workspace_id: "ws-1",
      user_id: "test-user-id",
      title: "Biology Flashcards",
      source_ids: ["res-1"],
      card_count: 10,
      status: "pending",
    };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([resource]);
      if (table === "flashcard_sets") return makeQueryChain(setRow);
      return makeQueryChain(null);
    });

    mockSpawn.mockReturnValue(createMockProcess(validCards, 0));

    // Act
    const res = await request(app).post("/api/flashcards/generate").send(validBody);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.title).toBe("Biology Flashcards");
  });

  it("returns 400 when workspace_id is missing", async () => {
    // Arrange
    const { workspace_id: _omit, ...incomplete } = validBody;

    // Act
    const res = await request(app).post("/api/flashcards/generate").send(incomplete);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 when resource_ids is empty", async () => {
    // Act
    const res = await request(app)
      .post("/api/flashcards/generate")
      .send({ ...validBody, resource_ids: [] });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 500 when no resources have extracted text", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain([{ id: "res-1", extracted_text: null }]));

    // Act
    const res = await request(app).post("/api/flashcards/generate").send(validBody);

    // Assert
    expect(res.status).toBe(500);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// GET /api/flashcards/workspace/:workspaceId
// ---------------------------------------------------------------------------

describe("GET /api/flashcards/workspace/:workspaceId", () => {
  it("returns 200 with an array of flashcard set rows", async () => {
    // Arrange
    const rows = [
      { id: "set-1", workspace_id: "ws-1", title: "Biology Flashcards", card_count: 10, status: "ready" },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    // Act
    const res = await request(app).get("/api/flashcards/workspace/ws-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("set-1");
  });

  it("returns 200 with empty array when workspace has no flashcard sets", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const res = await request(app).get("/api/flashcards/workspace/empty-ws");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/flashcards/:id/cards/:cardId/status
// ---------------------------------------------------------------------------

describe("PATCH /api/flashcards/:id/cards/:cardId/status", () => {
  it("returns 200 on successful status update to 'known'", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const res = await request(app)
      .patch("/api/flashcards/set-1/cards/card-1/status")
      .send({ status: "known" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });

  it("returns 200 on successful status update to 'review'", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const res = await request(app)
      .patch("/api/flashcards/set-1/cards/card-1/status")
      .send({ status: "review" });

    // Assert
    expect(res.status).toBe(200);
  });

  it("returns 400 when status value is invalid", async () => {
    // Act
    const res = await request(app)
      .patch("/api/flashcards/set-1/cards/card-1/status")
      .send({ status: "invalid-status" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 when status is missing from body", async () => {
    // Act
    const res = await request(app)
      .patch("/api/flashcards/set-1/cards/card-1/status")
      .send({});

    // Assert
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/flashcards/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/flashcards/:id", () => {
  it("returns 200 on successful deletion", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const res = await request(app).delete("/api/flashcards/set-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });

  it("returns 500 when Supabase delete fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "FK violation" }));

    // Act
    const res = await request(app).delete("/api/flashcards/set-1");

    // Assert
    expect(res.status).toBe(500);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// Placeholder — Study Rooms routes (not yet built)
// ---------------------------------------------------------------------------

describe.skip("Study Rooms routes (not yet implemented)", () => {
  // TODO: add tests when Study Rooms feature is built
});

// ---------------------------------------------------------------------------
// Placeholder — Chatie routes (not yet built)
// ---------------------------------------------------------------------------

describe.skip("Chatie routes (not yet implemented)", () => {
  // TODO: add tests when Chatie feature is built
});
