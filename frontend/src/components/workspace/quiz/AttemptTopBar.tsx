"use client";

import { X } from "lucide-react";

interface AttemptTopBarProps {
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
}: AttemptTopBarProps) {
  const progressPct = totalQuestions > 0
    ? (currentQuestion / totalQuestions) * 100
    : 0;

  return (
    <div
      className="flex items-center gap-4 px-6 py-4 bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/50 backdrop-blur-sm border-b border-fade-border"
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
              backgroundColor: "var(--color-blue-accent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
