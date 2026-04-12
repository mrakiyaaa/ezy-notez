// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  resourceId: string;
  resourceName: string;
  cards: Flashcard[];
  createdAt: string;
  knownIds: string[];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function formatFlashcardDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
