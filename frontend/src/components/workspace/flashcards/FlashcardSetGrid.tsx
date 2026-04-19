"use client";

import type { FlashcardSet } from "./constants";
import FlashcardSetCard from "./FlashcardSetCard";

interface FlashcardSetGridProps {
  sets: FlashcardSet[];
  onStudy: (set: FlashcardSet) => void;
  onDelete: (id: string) => void;
}

export default function FlashcardSetGrid({
  sets,
  onStudy,
  onDelete,
}: FlashcardSetGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sets.map((set) => (
        <FlashcardSetCard
          key={set.id}
          set={set}
          onStudy={onStudy}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
