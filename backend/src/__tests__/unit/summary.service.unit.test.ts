/**
 * summary.service unit tests
 *
 * Mocks supabaseAdmin and axios to test each service function without any
 * external I/O.  The background OpenRouter pipeline is fire-and-forget, so
 * tests that trigger it only verify the synchronous return value (the pending
 * summary row) and that the correct errors propagate from the DB layer.
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
  generateGeneralSummary,
  generateResourceSummaries,
  getWorkspaceSummaries,
  getSummaryById,
  deleteSummary,
  regenerateSummary,
} from "../../services/summary.service";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;

/** Returns a mock OpenRouter chat-completion response with the given content. */
const openRouterResponse = (content: string) => ({
  data: { choices: [{ message: { content } }] },
});

beforeEach(() => {
  jest.clearAllMocks();
  // Provide a dummy API key so the background pipeline does not fail on the
  // key-presence guard before reaching the mocked axios.post call.
  process.env.OPENROUTER_API_KEY = "test-key-unit";
  // Default: axios.post succeeds with a valid OpenRouter response
  mockAxiosPost.mockResolvedValue(openRouterResponse("## Summary\n\nSome summary text."));
  // Default: axios.isAxiosError returns false
  (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
});

// ---------------------------------------------------------------------------
// getWorkspaceSummaries
// ---------------------------------------------------------------------------

describe("getWorkspaceSummaries", () => {
  it("returns an array of summaries for a workspace", async () => {
    const rows = [
      { id: "sum-1", workspace_id: "ws-1", content: "Summary A", status: "ready" },
      { id: "sum-2", workspace_id: "ws-1", content: "Summary B", status: "ready" },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    const result = await getWorkspaceSummaries("ws-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("sum-1");
  });

  it("returns an empty array when no summaries exist", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null));

    const result = await getWorkspaceSummaries("ws-empty");

    expect(result).toEqual([]);
  });

  it("throws when Supabase select fails", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "query error" }));

    await expect(getWorkspaceSummaries("ws-1")).rejects.toThrow(
      "Failed to fetch summaries for workspace",
    );
  });
});

// ---------------------------------------------------------------------------
// getSummaryById
// ---------------------------------------------------------------------------

describe("getSummaryById", () => {
  it("returns the summary row when found", async () => {
    const row = { id: "sum-1", content: "bullet summary", status: "ready" };
    mockFrom.mockReturnValue(makeQueryChain(row));

    const result = await getSummaryById("sum-1");

    expect(result?.id).toBe("sum-1");
  });

  it("returns null when Supabase single returns an error", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "row not found" }));

    const result = await getSummaryById("bad-id");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteSummary
// ---------------------------------------------------------------------------

describe("deleteSummary", () => {
  it("resolves without error on successful delete", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null));

    await expect(deleteSummary("sum-1")).resolves.toBeUndefined();
  });

  it("throws when Supabase delete returns an error", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "FK violation" }));

    await expect(deleteSummary("sum-1")).rejects.toThrow("Failed to delete summary");
  });
});

// ---------------------------------------------------------------------------
// generateGeneralSummary
// ---------------------------------------------------------------------------

describe("generateGeneralSummary", () => {
  const RESOURCE_ROW = { id: "res-1", extracted_text: "Long lecture text about neural networks." };
  const SUMMARY_ROW = { id: "sum-new", workspace_id: "ws-1", status: "pending", content: "" };

  it("inserts a pending summary row and returns it immediately", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "resources") return makeQueryChain([RESOURCE_ROW]);
      if (table === "summaries") return makeQueryChain(SUMMARY_ROW);
      return makeQueryChain(null);
    });

    const result = await generateGeneralSummary("ws-1", "user-1", "bullet");

    expect(result.status).toBe("pending");
    expect(result.id).toBe("sum-new");
  });

  it("throws when no resources with extracted text exist in the workspace", async () => {
    mockFrom.mockReturnValue(makeQueryChain([]));

    await expect(generateGeneralSummary("ws-empty", "user-1", "bullet")).rejects.toThrow(
      "No resources with extracted text found",
    );
  });

  it("throws when Supabase resources fetch fails", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "db down" }));

    await expect(generateGeneralSummary("ws-1", "user-1", "short")).rejects.toThrow(
      "Failed to fetch resources",
    );
  });

  it("throws when resources exist but all have null extracted_text", async () => {
    mockFrom.mockReturnValue(makeQueryChain([{ id: "res-1", extracted_text: null }]));

    await expect(generateGeneralSummary("ws-1", "user-1", "bullet")).rejects.toThrow(
      "No resources with extracted text found",
    );
  });
});

// ---------------------------------------------------------------------------
// generateResourceSummaries
// ---------------------------------------------------------------------------

describe("generateResourceSummaries", () => {
  it("returns one pending summary per resource with extracted text", async () => {
    const resources = [
      { id: "res-1", extracted_text: "Content A." },
      { id: "res-2", extracted_text: "Content B." },
    ];
    let fromCall = 0;
    mockFrom.mockImplementation(() => {
      fromCall++;
      if (fromCall === 1) return makeQueryChain(resources);
      return makeQueryChain({ id: `sum-${fromCall}`, status: "pending", content: "" });
    });

    const result = await generateResourceSummaries("ws-1", "user-1", "detailed", ["res-1", "res-2"]);

    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.status).toBe("pending"));
  });

  it("throws when none of the selected resources have extracted text", async () => {
    mockFrom.mockReturnValue(makeQueryChain([{ id: "res-1", extracted_text: null }]));

    await expect(
      generateResourceSummaries("ws-1", "user-1", "bullet", ["res-1"]),
    ).rejects.toThrow("None of the selected resources have extracted text");
  });

  it("throws when Supabase fetch fails", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "db error" }));

    await expect(
      generateResourceSummaries("ws-1", "user-1", "short", ["res-1"]),
    ).rejects.toThrow("Failed to fetch resources");
  });
});

// ---------------------------------------------------------------------------
// regenerateSummary
// ---------------------------------------------------------------------------

describe("regenerateSummary", () => {
  it("resets the summary to pending with the same format and returns the updated row", async () => {
    const existing = {
      id: "sum-1",
      resource_id: null,
      source_ids: ["res-1"],
      format: "bullet",
      status: "ready",
      content: "old content",
    };
    const resetRow = { id: "sum-1", status: "pending", content: "", format: "bullet" };

    let fromCall = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCall++;
      if (fromCall === 1) return makeQueryChain(existing); // getSummaryById
      if (table === "summaries") return makeQueryChain(resetRow); // update to pending
      if (table === "resources") return makeQueryChain([{ id: "res-1", extracted_text: "text" }]);
      return makeQueryChain(null);
    });

    const result = await regenerateSummary("sum-1");

    expect(result.status).toBe("pending");
  });

  it("uses new format when provided", async () => {
    const existing = {
      id: "sum-1",
      resource_id: null,
      source_ids: ["res-1"],
      format: "bullet",
      status: "ready",
      content: "old",
    };
    const resetRow = { id: "sum-1", status: "pending", content: "", format: "detailed" };

    let fromCall = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCall++;
      if (fromCall === 1) return makeQueryChain(existing);
      if (table === "summaries") return makeQueryChain(resetRow);
      if (table === "resources") return makeQueryChain([{ id: "res-1", extracted_text: "text" }]);
      return makeQueryChain(null);
    });

    const result = await regenerateSummary("sum-1", "detailed");

    expect(result.format).toBe("detailed");
  });

  it("throws when the summary does not exist", async () => {
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    await expect(regenerateSummary("non-existent")).rejects.toThrow(
      "Summary non-existent not found",
    );
  });

  it("works for per-resource summaries (resource_id set)", async () => {
    const existing = {
      id: "sum-2",
      resource_id: "res-1",
      source_ids: ["res-1"],
      format: "short",
      status: "failed",
      content: "",
    };
    const resetRow = { id: "sum-2", status: "pending", content: "", format: "short" };
    const resourceRow = { extracted_text: "resource text content" };

    let fromCall = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCall++;
      if (fromCall === 1) return makeQueryChain(existing); // getSummaryById
      if (table === "summaries") return makeQueryChain(resetRow); // update to pending
      if (table === "resources") return makeQueryChain(resourceRow); // single resource fetch
      return makeQueryChain(null);
    });

    const result = await regenerateSummary("sum-2");

    expect(result.status).toBe("pending");
  });
});
