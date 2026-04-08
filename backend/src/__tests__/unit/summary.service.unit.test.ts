/**
 * summary.service unit tests
 *
 * Mocks supabaseAdmin and child_process.spawn to test each service function
 * without any external I/O.
 */

jest.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), refreshSession: jest.fn() },
  },
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { supabaseAdmin } from "../../config/supabase";
import { spawn } from "child_process";
import { makeQueryChain } from "../helpers/queryChain";
import { createMockProcess } from "../helpers/mockProcess";
import {
  generateGeneralSummary,
  generateResourceSummaries,
  getWorkspaceSummaries,
  getSummaryById,
  deleteSummary,
  regenerateSummary,
} from "../../services/summary.service";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockSpawn = spawn as jest.Mock;

// ---------------------------------------------------------------------------
// getWorkspaceSummaries
// ---------------------------------------------------------------------------

describe("getWorkspaceSummaries", () => {
  it("returns an array of summaries for a workspace", async () => {
    // Arrange
    const rows = [
      { id: "sum-1", workspace_id: "ws-1", content: "Summary A", status: "ready" },
      { id: "sum-2", workspace_id: "ws-1", content: "Summary B", status: "ready" },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    // Act
    const result = await getWorkspaceSummaries("ws-1");

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("sum-1");
  });

  it("returns an empty array when no summaries exist", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const result = await getWorkspaceSummaries("ws-empty");

    // Assert
    expect(result).toEqual([]);
  });

  it("throws when Supabase select fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "query error" }));

    // Act & Assert
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
    // Arrange
    const row = { id: "sum-1", content: "bullet summary", status: "ready" };
    mockFrom.mockReturnValue(makeQueryChain(row));

    // Act
    const result = await getSummaryById("sum-1");

    // Assert
    expect(result?.id).toBe("sum-1");
  });

  it("returns null when Supabase single returns an error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "row not found" }));

    // Act
    const result = await getSummaryById("bad-id");

    // Assert
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteSummary
// ---------------------------------------------------------------------------

describe("deleteSummary", () => {
  it("resolves without error on successful delete", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act & Assert
    await expect(deleteSummary("sum-1")).resolves.toBeUndefined();
  });

  it("throws when Supabase delete returns an error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "FK violation" }));

    // Act & Assert
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
    // Arrange — Supabase: first call = resources SELECT, second call = summaries INSERT
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([RESOURCE_ROW]);
      if (table === "summaries") return makeQueryChain(SUMMARY_ROW);
      return makeQueryChain(null);
    });

    // Mock the background Python script (fire-and-forget)
    mockSpawn.mockReturnValue(createMockProcess("• neural networks\n• deep learning", 0));

    // Act
    const result = await generateGeneralSummary("ws-1", "user-1", "bullet");

    // Assert
    expect(result.status).toBe("pending");
    expect(result.id).toBe("sum-new");
  });

  it("throws when no resources with extracted text exist in the workspace", async () => {
    // Arrange — empty resources list
    mockFrom.mockReturnValue(makeQueryChain([]));

    // Act & Assert
    await expect(generateGeneralSummary("ws-empty", "user-1", "bullet")).rejects.toThrow(
      "No resources with extracted text found",
    );
  });

  it("throws when Supabase resources fetch fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "db down" }));

    // Act & Assert
    await expect(generateGeneralSummary("ws-1", "user-1", "short")).rejects.toThrow(
      "Failed to fetch resources",
    );
  });
});

// ---------------------------------------------------------------------------
// generateResourceSummaries
// ---------------------------------------------------------------------------

describe("generateResourceSummaries", () => {
  it("returns one pending summary per resource with extracted text", async () => {
    // Arrange
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

    mockSpawn.mockReturnValue(createMockProcess("summary output", 0));

    // Act
    const result = await generateResourceSummaries("ws-1", "user-1", "detailed", ["res-1", "res-2"]);

    // Assert
    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.status).toBe("pending"));
  });

  it("throws when none of the selected resources have extracted text", async () => {
    // Arrange — resources exist but with null text
    const resources = [{ id: "res-1", extracted_text: null }];
    mockFrom.mockReturnValue(makeQueryChain(resources));

    // Act & Assert
    await expect(
      generateResourceSummaries("ws-1", "user-1", "bullet", ["res-1"]),
    ).rejects.toThrow("None of the selected resources have extracted text");
  });
});

// ---------------------------------------------------------------------------
// regenerateSummary
// ---------------------------------------------------------------------------

describe("regenerateSummary", () => {
  it("resets the summary to pending with the same format and returns the updated row", async () => {
    // Arrange
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
      if (table === "resources") return makeQueryChain([{ id: "res-1", extracted_text: "text" }]);
      if (table === "summaries") return makeQueryChain(resetRow); // update
      return makeQueryChain(null);
    });

    mockSpawn.mockReturnValue(createMockProcess("new summary text", 0));

    // Act
    const result = await regenerateSummary("sum-1");

    // Assert
    expect(result.status).toBe("pending");
  });

  it("uses new format when provided", async () => {
    // Arrange
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
      if (table === "resources") return makeQueryChain([{ id: "res-1", extracted_text: "text" }]);
      if (table === "summaries") return makeQueryChain(resetRow);
      return makeQueryChain(null);
    });

    mockSpawn.mockReturnValue(createMockProcess("detailed summary", 0));

    // Act
    const result = await regenerateSummary("sum-1", "detailed");

    // Assert
    expect(result.format).toBe("detailed");
  });

  it("throws when the summary does not exist", async () => {
    // Arrange — getSummaryById returns null (Supabase error)
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act & Assert
    await expect(regenerateSummary("non-existent")).rejects.toThrow("Summary non-existent not found");
  });
});
