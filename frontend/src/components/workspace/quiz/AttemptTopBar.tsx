"use client";

import { X } from "lucide-react";
import type { AuraProps } from "./constants";

interface AttemptTopBarProps extends AuraProps {
  quizTitle: string;
  currentQuestion: number;
  totalQuestions: number;
  onExit: () => void;
}

export default function AttemptTopBar({
  quizTitle,
  currentQuestion,
  totalQuestions,
  onExit,
  auraHex,
  auraRgb,
}: AttemptTopBarProps) {
  const progressPct = totalQuestions > 0
    ? (currentQuestion / totalQuestions) * 100
    : 0;

  return (
    <div
      className="flex items-center gap-4 px-6 py-4 bg-bg-card/50 backdrop-blur-sm"
      style={{
        borderBottom: `1px solid rgba(${auraRgb}, 0.12)`,
      }}
    >
      {/* Exit button */}
      <button
        onClick={onExit}
        className="text-text-muted hover:text-text-primary transition-colors shrink-0 p-1"
        aria-label="Exit quiz"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Quiz title */}
      <div className="flex-1 min-w-0">
        <p className="text-text-secondary text-sm font-medium truncate">
          {quizTitle}
        </p>
      </div>

      {/* Progress section */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Question counter */}
        <span className="text-text-muted text-sm tabular-nums">
          Question{" "}
          <span className="text-text-primary font-semibold">
            {currentQuestion}
          </span>{" "}
          of{" "}
          <span className="text-text-primary font-semibold">
            {totalQuestions}
          </span>
        </span>

        {/* Progress bar */}
        <div className="w-32 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPct}%`,
              backgroundColor: auraHex,
              boxShadow: `0 0 8px rgba(${auraRgb}, 0.4)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
