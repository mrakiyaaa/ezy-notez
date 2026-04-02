export type FlashcardStatus = "unknown" | "known" | "review";
export type FlashcardSetStatus = "pending" | "processing" | "ready" | "failed";

export interface Flashcard {
  id: string;
  set_id: string;
  front: string;
  back: string;
  position: number;
  status: FlashcardStatus;
  created_at: string;
}

export interface FlashcardSet {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  source_ids: string[];
  card_count: number;
  status: FlashcardSetStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlashcardSetWithCards extends FlashcardSet {
  cards: Flashcard[];
}
