/**
 * resource.service unit tests
 *
 * Mocks supabaseAdmin, UTApi (uploadthing/server), pdf-parse, and child_process.
 */

jest.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), refreshSession: jest.fn() },
  },
}));

jest.mock("uploadthing/server", () => ({
  UTApi: jest.fn().mockImplementation(() => ({
    deleteFiles: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: "extracted pdf content" }),
  })),
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { supabaseAdmin } from "../../config/supabase";
import { spawn } from "child_process";
import { makeQueryChain } from "../helpers/queryChain";
import { createMockProcess } from "../helpers/mockProcess";
import {
  insertResource,
  getWorkspaceResources,
  updateResourceStatus,
  deleteResourceById,
  extractAndStoreText,
  extractAndStoreAudio,
  extractAndStorePptx,
} from "../../services/resource.service";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockSpawn = spawn as jest.Mock;

// ---------------------------------------------------------------------------
// insertResource
// ---------------------------------------------------------------------------

describe("insertResource", () => {
  const validInput = {
    user_id: "user-1",
    workspace_id: "ws-1",
    name: "lecture.pdf",
    url: "https://utfs.io/f/abc123",
    size: 1024,
    type: "pdf" as const,
    status: "uploading" as const,
  };

  it("returns the inserted resource row on success", async () => {
    // Arrange
    const expected = { id: "res-1", ...validInput, created_at: "2024-01-01", extracted_text: null };
    mockFrom.mockReturnValue(makeQueryChain(expected));

    // Act
    const result = await insertResource(validInput);

    // Assert
    expect(result.id).toBe("res-1");
    expect(result.name).toBe("lecture.pdf");
    expect(mockFrom).toHaveBeenCalledWith("resources");
  });

  it("throws when Supabase insert returns an error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "duplicate key" }));

    // Act & Assert
    await expect(insertResource(validInput)).rejects.toThrow("Failed to insert resource");
  });
});

// ---------------------------------------------------------------------------
// getWorkspaceResources
// ---------------------------------------------------------------------------

describe("getWorkspaceResources", () => {
  it("returns an array of resources for a workspace", async () => {
    // Arrange
    const rows = [
      { id: "res-1", workspace_id: "ws-1", name: "a.pdf" },
      { id: "res-2", workspace_id: "ws-1", name: "b.pdf" },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    // Act
    const result = await getWorkspaceResources("ws-1");

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("res-1");
  });

  it("returns an empty array when workspace has no resources", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain([]));

    // Act
    const result = await getWorkspaceResources("empty-ws");

    // Assert
    expect(result).toEqual([]);
  });

  it("throws when Supabase select fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "connection refused" }));

    // Act & Assert
    await expect(getWorkspaceResources("ws-1")).rejects.toThrow("Failed to fetch resources");
  });
});

// ---------------------------------------------------------------------------
// updateResourceStatus
// ---------------------------------------------------------------------------

describe("updateResourceStatus", () => {
  it("returns the updated resource row", async () => {
    // Arrange
    const updated = { id: "res-1", status: "ready", url: "https://utfs.io/f/newkey" };
    mockFrom.mockReturnValue(makeQueryChain(updated));

    // Act
    const result = await updateResourceStatus("res-1", "ready", "https://utfs.io/f/newkey");

    // Assert
    expect(result.status).toBe("ready");
    expect(result.url).toBe("https://utfs.io/f/newkey");
  });

  it("updates status only when url is not provided", async () => {
    // Arrange
    const updated = { id: "res-1", status: "failed" };
    mockFrom.mockReturnValue(makeQueryChain(updated));

    // Act
    const result = await updateResourceStatus("res-1", "failed");

    // Assert
    expect(result.status).toBe("failed");
  });

  it("throws when Supabase update returns an error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "row not found" }));

    // Act & Assert
    await expect(updateResourceStatus("bad-id", "ready")).rejects.toThrow("Failed to update resource");
  });
});

// ---------------------------------------------------------------------------
// deleteResourceById
// ---------------------------------------------------------------------------

describe("deleteResourceById", () => {
  it("deletes the DB record and calls UTApi.deleteFiles for utfs.io URLs", async () => {
    // Arrange — first from() for SELECT url, second from() for DELETE
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeQueryChain({ url: "https://utfs.io/f/file-key-abc" });
      return makeQueryChain(null);
    });

    // Act
    await deleteResourceById("res-1");

    // Assert — UTApi must have been called with the file key
    const { UTApi } = require("uploadthing/server");
    const utapiInstance = UTApi.mock.results[0].value;
    expect(utapiInstance.deleteFiles).toHaveBeenCalledWith(["file-key-abc"]);
  });

  it("deletes the DB record without calling UTApi for non-utfs.io URLs (YouTube)", async () => {
    // Arrange
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeQueryChain({ url: "https://www.youtube.com/watch?v=abc" });
      return makeQueryChain(null);
    });

    const { UTApi } = require("uploadthing/server");
    UTApi.mockClear();

    // Act
    await deleteResourceById("res-youtube");

    // Assert
    expect(UTApi).not.toHaveBeenCalled();
  });

  it("throws when the initial SELECT fails", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act & Assert
    await expect(deleteResourceById("bad-id")).rejects.toThrow("Failed to fetch resource before deletion");
  });
});

// ---------------------------------------------------------------------------
// extractAndStoreText (PDF)
// ---------------------------------------------------------------------------

describe("extractAndStoreText", () => {
  it("marks resource indexing, stores extracted text, then marks ready", async () => {
    // Arrange — first update (indexing), second update (ready)
    const updates: unknown[] = [];
    mockFrom.mockImplementation(() => {
      const chain = makeQueryChain({ id: "res-1", extracted_text: null });
      (chain.update as jest.Mock).mockImplementation((payload: unknown) => {
        updates.push(payload);
        return chain;
      });
      return chain;
    });

    // Act
    await extractAndStoreText("res-1", "https://utfs.io/f/file.pdf");

    // Assert
    const statuses = (updates as Array<{ status: string }>).map((u) => u.status);
    expect(statuses).toContain("indexing");
    expect(statuses).toContain("ready");
  });

  it("marks resource as failed when PDF parse throws", async () => {
    // Arrange
    const { PDFParse } = require("pdf-parse");
    PDFParse.mockImplementation(() => ({
      getText: jest.fn().mockRejectedValue(new Error("corrupt PDF")),
    }));

    const updates: unknown[] = [];
    mockFrom.mockImplementation(() => {
      const chain = makeQueryChain(null);
      (chain.update as jest.Mock).mockImplementation((payload: unknown) => {
        updates.push(payload);
        return chain;
      });
      return chain;
    });

    // Act & Assert
    await expect(extractAndStoreText("res-1", "https://utfs.io/f/bad.pdf")).rejects.toThrow(
      "corrupt PDF",
    );
    const statuses = (updates as Array<{ status: string }>).map((u) => u.status);
    expect(statuses).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// extractAndStoreAudio (Whisper via Python)
// ---------------------------------------------------------------------------

describe("extractAndStoreAudio", () => {
  it("stores the transcript and marks ready when Python script succeeds", async () => {
    // Arrange
    mockSpawn.mockReturnValue(createMockProcess("transcribed audio text", 0));

    const updates: unknown[] = [];
    mockFrom.mockImplementation(() => {
      const chain = makeQueryChain(null);
      (chain.update as jest.Mock).mockImplementation((payload: unknown) => {
        updates.push(payload);
        return chain;
      });
      return chain;
    });

    // Act
    await extractAndStoreAudio("res-2", "https://utfs.io/f/audio.mp3");

    // Assert
    const readyUpdate = (updates as Array<{ status: string; extracted_text?: string }>).find(
      (u) => u.status === "ready",
    );
    expect(readyUpdate?.extracted_text).toBe("transcribed audio text");
  });

  it("marks resource as failed when Python script exits non-zero", async () => {
    // Arrange
    mockSpawn.mockReturnValue(createMockProcess("", 1, "whisper error: CUDA unavailable"));

    const updates: unknown[] = [];
    mockFrom.mockImplementation(() => {
      const chain = makeQueryChain(null);
      (chain.update as jest.Mock).mockImplementation((payload: unknown) => {
        updates.push(payload);
        return chain;
      });
      return chain;
    });

    // Act & Assert
    await expect(extractAndStoreAudio("res-2", "https://utfs.io/f/audio.mp3")).rejects.toThrow();
    const statuses = (updates as Array<{ status: string }>).map((u) => u.status);
    expect(statuses).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// extractAndStorePptx
// ---------------------------------------------------------------------------

describe("extractAndStorePptx", () => {
  it("stores extracted PPTX text and marks ready when script succeeds", async () => {
    // Arrange
    mockSpawn.mockReturnValue(createMockProcess("slide 1 content\nslide 2 content", 0));

    const updates: unknown[] = [];
    mockFrom.mockImplementation(() => {
      const chain = makeQueryChain(null);
      (chain.update as jest.Mock).mockImplementation((payload: unknown) => {
        updates.push(payload);
        return chain;
      });
      return chain;
    });

    // Act
    await extractAndStorePptx("res-3", "https://utfs.io/f/slides.pptx");

    // Assert
    const readyUpdate = (updates as Array<{ status: string; extracted_text?: string }>).find(
      (u) => u.status === "ready",
    );
    expect(readyUpdate?.extracted_text).toContain("slide 1 content");
  });
});
