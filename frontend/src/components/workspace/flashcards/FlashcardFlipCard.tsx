"use client";

import type { Flashcard, AuraProps } from "./constants";

interface FlashcardFlipCardProps extends AuraProps {
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
  auraHex,
  auraRgb,
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
            borderColor: `rgba(${auraRgb}, 0.25)`,
            boxShadow: `0 0 50px rgba(${auraRgb}, 0.10), inset 0 0 80px rgba(${auraRgb}, 0.03)`,
          }}
        >
          {/* Label badge */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              backgroundColor: `rgba(${auraRgb}, 0.12)`,
              color: auraHex,
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

          {/* Bottom shimmer line */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-px pointer-events-none"
            style={{
              background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.45), transparent)`,
            }}
          />
        </div>

        {/* ── Back face ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-8 gap-5"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: `rgba(${auraRgb}, 0.05)`,
            borderColor: `rgba(${auraRgb}, 0.4)`,
            boxShadow: `0 0 60px rgba(${auraRgb}, 0.18), inset 0 0 100px rgba(${auraRgb}, 0.05)`,
          }}
        >
          {/* Label badge */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              backgroundColor: `rgba(${auraRgb}, 0.2)`,
              color: auraHex,
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

          {/* Bottom shimmer line (stronger on answer side) */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-px pointer-events-none"
            style={{
              background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.65), transparent)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
