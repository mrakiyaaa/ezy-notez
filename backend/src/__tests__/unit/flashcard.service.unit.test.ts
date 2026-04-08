/**
 * flashcard.service unit tests
 *
 * Mocks supabaseAdmin and child_process.spawn to test each exported function.
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
  generateFlashcards,
  getWorkspaceFlashcardSets,
  getFlashcardSetById,
  deleteFlashcardSet,
  updateFlashcardStatus,
  regenerateFlashcardSet,
} from "../../services/flashcard.service";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockSpawn = spawn as jest.Mock;

// ---------------------------------------------------------------------------
// getWorkspaceFlashcardSets
// ---------------------------------------------------------------------------

describe("getWorkspaceFlashcardSets", () => {
  it("returns an array of flashcard set rows for a workspace", async () => {
    // Arrange
    const rows = [
      { id: "set-1", workspace_id: "ws-1", title: "Biology Flashcards", card_count: 10 },
      { id: "set-2", workspace_id: "ws-1", title: "Chemistry Flashcards", card_count: 8 },
    ];
    mockFrom.mockReturnValue(makeQueryChain(rows));

    // Act
    const result = await getWorkspaceFlashcardSets("ws-1");

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("set-1");
  });

  it("returns an empty array when workspace has no sets", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act
    const result = await getWorkspaceFlashcardSets("ws-empty");

    // Assert
    expect(result).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "permission denied" }));

    // Act & Assert
    await expect(getWorkspaceFlashcardSets("ws-1")).rejects.toThrow("Failed to fetch flashcard sets");
  });
});

// ---------------------------------------------------------------------------
// getFlashcardSetById
// ---------------------------------------------------------------------------

describe("getFlashcardSetById", () => {
  it("returns the set with its cards when found", async () => {
    // Arrange
    const setRow = { id: "set-1", title: "Biology", card_count: 2 };
    const cards = [
      { id: "card-1", set_id: "set-1", front: "What is DNA?", back: "Deoxyribonucleic acid" },
      { id: "card-2", set_id: "set-1", front: "What is RNA?", back: "Ribonucleic acid" },
    ];
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeQueryChain(setRow); // flashcard_sets SELECT single
      return makeQueryChain(cards);                   // flashcards SELECT
    });

    // Act
    const result = await getFlashcardSetById("set-1");

    // Assert
    expect(result?.id).toBe("set-1");
    expect(result?.cards).toHaveLength(2);
    expect(result?.cards[0].front).toBe("What is DNA?");
  });

  it("returns null when the set does not exist", async () => {
    // Arrange — single() call returns error → service returns null
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "row not found" }));

    // Act
    const result = await getFlashcardSetById("non-existent");

    // Assert
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteFlashcardSet
// ---------------------------------------------------------------------------

describe("deleteFlashcardSet", () => {
  it("resolves without error on successful delete", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act & Assert
    await expect(deleteFlashcardSet("set-1")).resolves.toBeUndefined();
  });

  it("throws when Supabase delete returns an error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "FK constraint violation" }));

    // Act & Assert
    await expect(deleteFlashcardSet("set-1")).rejects.toThrow("Failed to delete flashcard set");
  });
});

// ---------------------------------------------------------------------------
// updateFlashcardStatus
// ---------------------------------------------------------------------------

describe("updateFlashcardStatus", () => {
  it("resolves without error when update succeeds", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null));

    // Act & Assert
    await expect(updateFlashcardStatus("card-1", "known")).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith("flashcards");
  });

  it("throws when Supabase update returns an error", async () => {
    // Arrange
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "card not found" }));

    // Act & Assert
    await expect(updateFlashcardStatus("bad-card", "review")).rejects.toThrow(
      "Failed to update flashcard status",
    );
  });
});

// ---------------------------------------------------------------------------
// generateFlashcards
// ---------------------------------------------------------------------------

describe("generateFlashcards", () => {
  const validCards = JSON.stringify([
    { front: "What is ATP?", back: "Adenosine triphosphate" },
    { front: "What is ADP?", back: "Adenosine diphosphate" },
  ]);

  it("returns a pending flashcard set row immediately after inserting it", async () => {
    // Arrange
    const resourceRow = { id: "res-1", extracted_text: "Biochemistry lecture content." };
    const setRow = { id: "set-new", workspace_id: "ws-1", status: "pending", card_count: 10 };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([resourceRow]);
      if (table === "flashcard_sets") return makeQueryChain(setRow);
      return makeQueryChain(null);
    });

    mockSpawn.mockReturnValue(createMockProcess(validCards, 0));

    // Act
    const result = await generateFlashcards("ws-1", "user-1", ["res-1"]);

    // Assert
    expect(result.id).toBe("set-new");
    expect(result.status).toBe("pending");
  });

  it("clamps card_count to minimum of 5", async () => {
    // Arrange
    const resourceRow = { id: "res-1", extracted_text: "text" };
    const capturedInsert: unknown[] = [];
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([resourceRow]);
      const chain = makeQueryChain({ id: "set-new", status: "pending", card_count: 5 });
      (chain.insert as jest.Mock).mockImplementation((payload: unknown) => {
        capturedInsert.push(payload);
        return chain;
      });
      return chain;
    });

    mockSpawn.mockReturnValue(createMockProcess(validCards, 0));

    // Act
    await generateFlashcards("ws-1", "user-1", ["res-1"], undefined, 2);

    // Assert — card_count was clamped from 2 to 5
    const inserted = capturedInsert[0] as { card_count: number };
    expect(inserted.card_count).toBe(5);
  });

  it("clamps card_count to maximum of 20", async () => {
    // Arrange
    const resourceRow = { id: "res-1", extracted_text: "text" };
    const capturedInsert: unknown[] = [];
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === "resources") return makeQueryChain([resourceRow]);
      const chain = makeQueryChain({ id: "set-new", status: "pending", card_count: 20 });
      (chain.insert as jest.Mock).mockImplementation((payload: unknown) => {
        capturedInsert.push(payload);
        return chain;
      });
      return chain;
    });

    mockSpawn.mockReturnValue(createMockProcess(validCards, 0));

    // Act
    await generateFlashcards("ws-1", "user-1", ["res-1"], undefined, 50);

    // Assert — card_count was clamped from 50 to 20
    const inserted = capturedInsert[0] as { card_count: number };
    expect(inserted.card_count).toBe(20);
  });

  it("throws when no resources have extracted text", async () => {
    // Arrange — resources exist but with null text
    mockFrom.mockReturnValue(makeQueryChain([{ id: "res-1", extracted_text: null }]));

    // Act & Assert
    await expect(generateFlashcards("ws-1", "user-1", ["res-1"])).rejects.toThrow(
      "None of the selected resources have extracted text",
    );
  });
});

// ---------------------------------------------------------------------------
// regenerateFlashcardSet
// ---------------------------------------------------------------------------

describe("regenerateFlashcardSet", () => {
  const validCards = JSON.stringify([{ front: "Q", back: "A" }]);

  it("clears old cards, resets set to pending, and returns the updated set row", async () => {
    // Arrange
    const existingSet = {
      id: "set-1",
      title: "Biology Flashcards",
      source_ids: ["res-1"],
      card_count: 10,
      cards: [{ id: "card-old" }],
    };
    const resetSet = { id: "set-1", status: "pending", card_count: 10 };

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (call === 1) return makeQueryChain(existingSet); // flashcard_sets single (getFlashcardSetById)
      if (call === 2) return makeQueryChain([]); // flashcards SELECT for cards
      if (table === "resources") return makeQueryChain([{ id: "res-1", extracted_text: "bio text" }]);
      if (table === "flashcards") return makeQueryChain(null); // DELETE old cards
      if (table === "flashcard_sets") return makeQueryChain(resetSet); // UPDATE set
      return makeQueryChain(null);
    });

    mockSpawn.mockReturnValue(createMockProcess(validCards, 0));

    // Act
    const result = await regenerateFlashcardSet("set-1");

    // Assert
    expect(result.id).toBe("set-1");
    expect(result.status).toBe("pending");
  });

  it("throws when the flashcard set does not exist", async () => {
    // Arrange — getFlashcardSetById returns null
    mockFrom.mockReturnValue(makeQueryChain(null, { message: "not found" }));

    // Act & Assert
    await expect(regenerateFlashcardSet("non-existent")).rejects.toThrow("Flashcard set non-existent not found");
  });
});
