/**
 * Summary route integration tests
 *
 * Fires real HTTP requests against the Express app with mocked Supabase,
 * auth middleware, and axios (OpenRouter client).
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

jest.mock("axios");

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

const openRouterResponse = (content: string) => ({
  data: { choices: [{ message: { content } }] },
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.OPENROUTER_API_KEY = "test-key-integration";
  mockAxiosPost.mockResolvedValue(openRouterResponse("## Summary\n\nTest summary content."));
  (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
});

// ---------------------------------------------------------------------------
// POST /api/summaries/general
// ---------------------------------------------------------------------------

describe("POST /api/summaries/general", () => {
  it("returns 201 with a pending summary object when resources exist", async () => {
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

    mockFrom.mockImplementation((table: string) => {
      if (table === "resources") return makeQueryChain([resource]);
      if (table === "summaries") return makeQueryChain(summary);
      return makeQueryChain(null);
    });

    const res = await request(app)
      .post("/api/summaries/general")
      .send({ workspace_id: "ws-1", format: "bullet" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data).toHaveProperty("content");
  });

  it("returns 400 when no resources have extracted text", async () => {
    mockFrom.mockReturnValue(makeQueryChain([]));

    const res = await request(app)
      .post("/api/summaries/general")
      .send({ workspace_id: "ws-empty", format: "bullet" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 when workspace_id is missing", async () => {
    const res = await request(app)
      .post("/api/summaries/general")
      .send({ format: "bullet" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 when format is invalid", async () => {
    const res = await request(app)
      .post("/api/summaries/general")
      .send({ workspace_id: "ws-1", format: "invalid-format" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// POST /api/summaries/custom
// ---------------------------------------------------------------------------

describe("POST /api/summaries/custom", () => {
  it("returns 201 with an array of pending summary objects", async () => {
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

    const res = await request(app)
      .post("/api/summaries/custom")
      .send({ workspace_id: "ws-1", format: "short", resource_ids: ["res-1", "res-2"] });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("returns 400 when resource_ids is empty", async () => {
    const res = await request(app)
      .post("/api/summaries/custom")
      .send({ workspace_id: "ws-1", format: "short", resource_ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// GET /api/summaries/workspace/:workspaceId
// ---------------------------------------------------------------------------

describe("GET /api/summaries/workspace/:workspaceId", () => {
  it("returns 200 with an array of summary rows", async () => {
    const rows = [
      { id: "sum-1", workspace_id: "ws-1", status: "ready", content: "Summary A" },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    const res = await request(app).get("/api/summaries/workspace/ws-1");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/summaries/:id
// ---------------------------------------------------------------------------

describe("GET /api/summaries/:id", () => {
  it("returns 200 with the summary row when found", async () => {
    const row = { id: "sum-1", content: "detailed content", status: "ready" };
    mockFrom.mockReturnValue(makeQueryChain(row));

    const res = await request(app).get("/api/summaries/sum-1");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("sum-1");
  });

  it("returns 404 when summary is not found", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    const res = await request(app).get("/api/summaries/non-existent");

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/summaries/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/summaries/:id", () => {
  it("returns 200 on successful deletion", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null));

    const res = await request(app).delete("/api/summaries/sum-1");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });
});
