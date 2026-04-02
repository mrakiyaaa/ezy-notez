import { apiClient } from "@/api/axios-config";
import type {
  FlashcardSet,
  FlashcardSetWithCards,
  FlashcardStatus,
} from "@/types/flashcard";

/**
 * Generate flashcards from selected resources.
 * Returns the pending set immediately; cards are generated in background.
 */
export async function generateFlashcards(
  workspaceId: string,
  resourceIds: string[],
  topic?: string,
  cardCount?: number
): Promise<FlashcardSet> {
  try {
    const response = await apiClient.post("/flashcards/generate", {
      workspace_id: workspaceId,
      resource_ids: resourceIds,
      topic,
      card_count: cardCount,
    });
    return response.data.data as FlashcardSet;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to generate flashcards"
    );
  }
}

/**
 * Get all flashcard sets for a workspace (without cards).
 */
export async function getWorkspaceFlashcardSets(
  workspaceId: string
): Promise<FlashcardSet[]> {
  try {
    const response = await apiClient.get(
      `/flashcards/workspace/${workspaceId}`
    );
    return (response.data.data ?? []) as FlashcardSet[];
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to fetch flashcard sets"
    );
  }
}

/**
 * Get a single flashcard set with all its cards.
 */
export async function getFlashcardSetById(
  id: string
): Promise<FlashcardSetWithCards> {
  try {
    const response = await apiClient.get(`/flashcards/${id}`);
    return response.data.data as FlashcardSetWithCards;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to fetch flashcard set ${id}`
    );
  }
}

/**
 * Delete a flashcard set.
 */
export async function deleteFlashcardSet(id: string): Promise<void> {
  try {
    await apiClient.delete(`/flashcards/${id}`);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to delete flashcard set ${id}`
    );
  }
}

/**
 * Update a single card's status (known/review/unknown).
 */
export async function updateCardStatus(
  setId: string,
  cardId: string,
  status: FlashcardStatus
): Promise<void> {
  try {
    await apiClient.patch(`/flashcards/${setId}/cards/${cardId}/status`, {
      status,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to update card status`
    );
  }
}

/**
 * Regenerate flashcards for an existing set.
 */
export async function regenerateFlashcardSet(
  id: string,
  topic?: string,
  cardCount?: number
): Promise<FlashcardSet> {
  try {
    const response = await apiClient.post(`/flashcards/${id}/regenerate`, {
      topic,
      card_count: cardCount,
    });
    return response.data.data as FlashcardSet;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed to regenerate flashcard set ${id}`
    );
  }
}
