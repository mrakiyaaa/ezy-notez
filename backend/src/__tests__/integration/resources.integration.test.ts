/**
 * Resources route integration tests
 *
 * Fires real HTTP requests against the Express app with mocked Supabase,
 * auth middleware, and UploadThing.
 */

// ---------------------------------------------------------------------------
// Module mocks — must appear before any imports
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

jest.mock("uploadthing/server", () => ({
  UTApi: jest.fn().mockImplementation(() => ({
    deleteFiles: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: "pdf content" }),
  })),
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import request from "supertest";
import { supabaseAdmin } from "../../config/supabase";
import { makeQueryChain } from "../helpers/queryChain";
import { createTestApp } from "../helpers/createTestApp";

const mockFrom = supabaseAdmin.from as jest.Mock;
const app = createTestApp();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/resources", () => {
  const validBody = {
    workspace_id: "ws-1",
    name: "lecture.pdf",
    url: "https://utfs.io/f/abc123",
    size: 2048,
    type: "pdf",
    status: "uploading",
  };

  it("returns 201 with the created resource on valid payload", async () => {
    // Arrange
    const created = {
      id: "res-new",
      user_id: "test-user-id",
      workspace_id: "ws-1",
      name: "lecture.pdf",
      url: "https://utfs.io/f/abc123",
      size: 2048,
      type: "pdf",
      status: "uploading",
      created_at: new Date().toISOString(),
      extracted_text: null,
    };
    mockFrom.mockReturnValue(makeQueryChain(created));

    // Act
    const res = await request(app).post("/api/resources").send(validBody);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.id).toBe("res-new");
    expect(res.body.data.type).toBe("pdf");
  });

  it("returns 400 when required fields are missing", async () => {
    // Arrange — missing workspace_id
    const { workspace_id: _omit, ...incomplete } = validBody;

    // Act
    const res = await request(app).post("/api/resources").send(incomplete);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 when Supabase insert fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "duplicate key" }));

    // Act
    const res = await request(app).post("/api/resources").send(validBody);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------

describe("GET /api/resources/workspace/:workspaceId", () => {
  it("returns 200 with an array of resources", async () => {
    // Arrange
    const rows = [
      { id: "res-1", workspace_id: "ws-1", name: "a.pdf", status: "ready" },
      { id: "res-2", workspace_id: "ws-1", name: "b.pdf", status: "ready" },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    // Act
    const res = await request(app).get("/api/resources/workspace/ws-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveLength(2);
  });

  it("returns 200 with an empty array when workspace has no resources", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const res = await request(app).get("/api/resources/workspace/empty-ws");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("PATCH /api/resources/:id/status", () => {
  it("returns 200 with the updated resource when payload is valid", async () => {
    // Arrange
    const updated = { id: "res-1", status: "ready", url: "https://utfs.io/f/newkey" };
    mockFrom.mockReturnValue(makeQueryChain(updated));

    // Act
    const res = await request(app)
      .patch("/api/resources/res-1/status")
      .send({ status: "ready", url: "https://utfs.io/f/newkey" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ready");
  });

  it("returns 400 when status is missing from the body", async () => {
    // Act
    const res = await request(app).patch("/api/resources/res-1/status").send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------

describe("DELETE /api/resources/:id", () => {
  it("returns 200 on successful deletion", async () => {
    // Arrange — SELECT url, then DELETE
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeQueryChain({ url: "https://utfs.io/f/key123" });
      return makeQueryChain(null);
    });

    // Act
    const res = await request(app).delete("/api/resources/res-1");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });
});
