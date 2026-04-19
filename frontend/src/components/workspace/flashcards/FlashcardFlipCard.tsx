"use client";

import type { Flashcard } from "./constants";

interface FlashcardFlipCardProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
  cardNumber: number;
  totalCards: number;
}

export default function FlashcardFlipCard({
  card,
  isFlipped,
  onFlip,
  cardNumber,
  totalCards,
}: FlashcardFlipCardProps) {
  return (
    <div
      className="w-full max-w-2xl mx-auto cursor-pointer select-none"
      style={{ perspective: "1200px" }}
      onClick={onFlip}
      role="button"
      aria-label={
        isFlipped
          ? "Answer side — click to flip back"
          : "Question side — click to reveal answer"
      }
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFlip();
      }}
    >
      {/* Rotating inner container */}
      <div
        className="relative w-full transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "300px",
        }}
      >
        {/* ── Front face ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-8 gap-5"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            backgroundColor: "var(--color-bg-card)",
          }}
        >
          {/* Label badge */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              color: "var(--color-blue-accent)",
            }}
          >
            Question
          </span>

          {/* Question text */}
          <p className="text-text-primary text-xl font-medium text-center leading-relaxed max-w-lg">
            {card.front}
          </p>

          {/* Hint */}
          <p className="text-text-muted text-xs">Click or press Space to reveal answer</p>

          {/* Card number */}
          <span className="absolute top-4 right-5 text-text-muted text-xs tabular-nums">
            {cardNumber} / {totalCards}
          </span>
        </div>

        {/* ── Back face ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-8 gap-5"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "var(--color-bg-card)",
          }}
        >
          {/* Label badge */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              color: "var(--color-blue-accent)",
            }}
          >
            Answer
          </span>

          {/* Answer text */}
          <p className="text-text-primary text-lg text-center leading-relaxed max-w-lg">
            {card.back}
          </p>

          {/* Hint */}
          <p className="text-text-muted text-xs">Click or press Space to flip back</p>

          {/* Card number */}
          <span className="absolute top-4 right-5 text-text-muted text-xs tabular-nums">
            {cardNumber} / {totalCards}
          </span>
        </div>
      </div>
    </div>
  );
}
