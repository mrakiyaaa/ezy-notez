"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  X,
  Check,
  BookmarkPlus,
} from "lucide-react";
import type { FlashcardSet, AuraProps } from "./constants";
import FlashcardFlipCard from "./FlashcardFlipCard";
import { updateCardStatus } from "@/services/flashcard.service";

interface StudyModeProps extends AuraProps {
  set: FlashcardSet;
  onExit: () => void;
  onComplete: (knownIds: string[], reviewIds: string[]) => void;
}

export default function StudyMode({
  set,
  onExit,
  onComplete,
  auraHex,
  auraRgb,
  auraContrast,
}: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  const cards = set.cards;
  const total = cards.length;
  const currentCard = cards[currentIndex];
  const progressPct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, total]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  const advanceOrComplete = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, total]);

  const handleKnown = useCallback(() => {
    const id = currentCard.id;
    setKnownIds((prev) => new Set([...prev, id]));
    setReviewIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Persist to database (fire-and-forget)
    updateCardStatus(set.id, id, "known").catch((err) => {
      console.error("[StudyMode] Failed to persist known status:", err);
    });
    advanceOrComplete();
  }, [currentCard, set.id, advanceOrComplete]);

  const handleReview = useCallback(() => {
    const id = currentCard.id;
    setReviewIds((prev) => new Set([...prev, id]));
    setKnownIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Persist to database (fire-and-forget)
    updateCardStatus(set.id, id, "review").catch((err) => {
      console.error("[StudyMode] Failed to persist review status:", err);
    });
    advanceOrComplete();
  }, [currentCard, set.id, advanceOrComplete]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds(new Set());
    setReviewIds(new Set());
    setIsComplete(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isComplete) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, handleFlip, isComplete]);

  // ── Completion screen ──────────────────────────────────────────────────────
  if (isComplete) {
    const skipped = total - knownIds.size - reviewIds.size;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-7 text-center min-h-0">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            backgroundColor: `rgba(${auraRgb}, 0.12)`,
            boxShadow: `0 0 48px rgba(${auraRgb}, 0.22)`,
            border: `1px solid rgba(${auraRgb}, 0.25)`,
          }}
        >
          <Check className="w-10 h-10" style={{ color: auraHex }} />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-text-primary text-2xl font-bold mb-1.5">
            Session Complete!
          </h2>
          <p className="text-text-muted text-sm">
            You reviewed all {total} card{total !== 1 ? "s" : ""} in{" "}
            <span className="text-text-secondary">{set.title}</span>
          </p>
        </div>

        {/* Score cards */}
        <div className="flex gap-4 flex-wrap justify-center">
          <div className="rounded-xl border border-fade-border bg-bg-card px-7 py-4 text-center min-w-[88px]">
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ color: auraHex }}
            >
              {knownIds.size}
            </p>
            <p className="text-text-muted text-xs mt-1">Known</p>
          </div>
          <div className="rounded-xl border border-fade-border bg-bg-card px-7 py-4 text-center min-w-[88px]">
            <p className="text-2xl font-bold tabular-nums text-amber-400">
              {reviewIds.size}
            </p>
            <p className="text-text-muted text-xs mt-1">To Review</p>
          </div>
          {skipped > 0 && (
            <div className="rounded-xl border border-fade-border bg-bg-card px-7 py-4 text-center min-w-[88px]">
              <p className="text-2xl font-bold tabular-nums text-text-muted">
                {skipped}
              </p>
              <p className="text-text-muted text-xs mt-1">Skipped</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-fade-border text-text-secondary text-sm hover:text-text-primary hover:bg-white/5 transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
          <button
            onClick={() => {
              onComplete(Array.from(knownIds), Array.from(reviewIds));
              onExit();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ backgroundColor: auraHex, color: auraContrast }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.88";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Exit Study
          </button>
        </div>
      </div>
    );
  }

  // ── Active study screen ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar with progress */}
      <div
        className="flex items-center gap-4 px-6 py-4"
        style={{ borderBottom: `1px solid rgba(${auraRgb}, 0.12)` }}
      >
        <button
          onClick={onExit}
          className="text-text-muted hover:text-text-primary transition-colors shrink-0"
          aria-label="Exit study mode"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-text-muted text-xs mb-1.5 truncate">{set.title}</p>
          {/* Progress bar */}
          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%`, backgroundColor: auraHex }}
            />
          </div>
        </div>

        <span className="text-text-muted text-xs tabular-nums shrink-0">
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 gap-8 min-h-0 overflow-y-auto">
        <FlashcardFlipCard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          cardNumber={currentIndex + 1}
          totalCards={total}
          auraHex={auraHex}
          auraRgb={auraRgb}
          auraContrast={auraContrast}
        />

        {/* Navigation + action controls */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Prev */}
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="w-10 h-10 rounded-full border border-fade-border flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous card"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Review Later */}
          <button
            onClick={handleReview}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-amber-400/10"
            style={{
              border: "1px solid rgba(251,191,36,0.3)",
              color: "#fbbf24",
            }}
          >
            <BookmarkPlus className="w-4 h-4" />
            Review Later
          </button>

          {/* Flip */}
          <button
            onClick={handleFlip}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-fade-border text-text-secondary text-sm hover:text-text-primary hover:bg-white/5 transition-all duration-150"
          >
            <RotateCcw className="w-4 h-4" />
            Flip
          </button>

          {/* Known */}
          <button
            onClick={handleKnown}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: `rgba(${auraRgb}, 0.12)`,
              color: auraHex,
              border: `1px solid rgba(${auraRgb}, 0.28)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.24)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.12)`;
            }}
          >
            <Check className="w-4 h-4" />
            Known
          </button>

          {/* Next */}
          <button
            onClick={goNext}
            disabled={currentIndex === total - 1}
            className="w-10 h-10 rounded-full border border-fade-border flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next card"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-text-muted text-xs opacity-60">
          ← → to navigate &nbsp;·&nbsp; Space to flip
        </p>
      </div>
    </div>
  );
}
