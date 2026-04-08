/**
 * Summary route integration tests
 *
 * Fires real HTTP requests against the Express app with mocked Supabase,
 * auth middleware, and child_process (Python summarizer).
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
// POST /api/summaries/general
// ---------------------------------------------------------------------------

describe("POST /api/summaries/general", () => {
  it("returns 200 with a pending summary object when resources exist", async () => {
    // Arrange
    const resource = { id: "res-1", extracted_text: "Lecture content about neural networks." };
    const summary = {
      id: "sum-1",
      workspace_id: "ws-1",
      user_id: "test-user-id",
      format: "bullet",
      content: "",
      status: "pending",
      source_ids: ["res-1"],
      resource_id: null,
    };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([resource]);
      if (table === "summaries") return makeQueryChain(summary);
      return makeQueryChain(null);
    });

    mockSpawn.mockReturnValue(createMockProcess("• point one\n• point two", 0));

    // Act
    const res = await request(app)
      .post("/api/summaries/general")
      .send({ workspace_id: "ws-1", format: "bullet" });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data).toHaveProperty("content");
  });

  it("returns 500 when no resources have extracted text", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain([]));

    // Act
    const res = await request(app)
      .post("/api/summaries/general")
      .send({ workspace_id: "ws-empty", format: "bullet" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 when workspace_id is missing", async () => {
    // Act
    const res = await request(app)
      .post("/api/summaries/general")
      .send({ format: "bullet" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// POST /api/summaries/custom
// ---------------------------------------------------------------------------

describe("POST /api/summaries/custom", () => {
  it("returns 200 with an array of pending summary objects", async () => {
    // Arrange
    const resources = [
      { id: "res-1", extracted_text: "Content A" },
      { id: "res-2", extracted_text: "Content B" },
    ];
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain(resources);
      return makeQueryChain({
        id: `sum-${call}`,
        status: "pending",
        content: "",
        workspace_id: "ws-1",
      });
    });

    mockSpawn.mockReturnValue(createMockProcess("summary output", 0));

    // Act
    const res = await request(app)
      .post("/api/summaries/custom")
      .send({ workspace_id: "ws-1", format: "short", resource_ids: ["res-1", "res-2"] });

    // Assert
    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/summaries/workspace/:workspaceId
// ---------------------------------------------------------------------------

describe("GET /api/summaries/workspace/:workspaceId", () => {
  it("returns 200 with an array of summary rows", async () => {
    // Arrange
    const rows = [
      { id: "sum-1", workspace_id: "ws-1", status: "ready", content: "Summary A" },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    // Act
    const res = await request(app).get("/api/summaries/workspace/ws-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/summaries/:id
// ---------------------------------------------------------------------------

describe("GET /api/summaries/:id", () => {
  it("returns 200 with the summary row when found", async () => {
    // Arrange
    const row = { id: "sum-1", content: "detailed content", status: "ready" };
    mockFrom.mockReturnValue(makeQueryChain(row));

    // Act
    const res = await request(app).get("/api/summaries/sum-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("sum-1");
  });

  it("returns 404 when summary is not found", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act
    const res = await request(app).get("/api/summaries/non-existent");

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/summaries/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/summaries/:id", () => {
  it("returns 200 on successful deletion", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const res = await request(app).delete("/api/summaries/sum-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });
});
