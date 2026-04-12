"use client";

import { CheckCircle2, XCircle, ArrowRight, Lightbulb } from "lucide-react";
import { QUIZ_GREEN, QUIZ_GREEN_RGB, QUIZ_RED, QUIZ_RED_RGB } from "./constants";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  explanation: string;
  correctAnswerText?: string;
  onNext: () => void;
  isLastQuestion: boolean;
}

export default function AnswerFeedback({
  isCorrect,
  explanation,
  correctAnswerText,
  onNext,
  isLastQuestion,
}: AnswerFeedbackProps) {
  // Semantic colors for correct/incorrect feedback
  const accentColor = isCorrect ? QUIZ_GREEN : QUIZ_RED;
  const accentRgb = isCorrect ? QUIZ_GREEN_RGB : QUIZ_RED_RGB;

  return (
    <div
      className="rounded-xl border p-5 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{
        backgroundColor: `rgba(${accentRgb}, 0.06)`,
        borderColor: `rgba(${accentRgb}, 0.25)`,
        boxShadow: `0 0 30px rgba(${accentRgb}, 0.1)`,
      }}
    >
      {/* Result header */}
      <div className="flex items-center gap-3 mb-4">
        {isCorrect ? (
          <CheckCircle2 className="w-6 h-6" style={{ color: accentColor }} />
        ) : (
          <XCircle className="w-6 h-6" style={{ color: accentColor }} />
        )}
        <span
          className="text-lg font-semibold"
          style={{ color: accentColor }}
        >
          {isCorrect ? "Correct!" : "Incorrect"}
        </span>
      </div>

      {/* Show correct answer if wrong */}
      {!isCorrect && correctAnswerText && (
        <div
          className="rounded-lg px-4 py-3 mb-4"
          style={{
            backgroundColor: `rgba(${QUIZ_GREEN_RGB}, 0.08)`,
            border: `1px solid rgba(${QUIZ_GREEN_RGB}, 0.2)`,
          }}
        >
          <p className="text-xs text-text-muted mb-1">Correct Answer:</p>
          <p className="text-text-primary text-sm font-medium">
            {correctAnswerText}
          </p>
        </div>
      )}

      {/* Explanation */}
      <div className="flex gap-3 mb-5">
        <Lightbulb
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        />
        <div>
          <p className="text-xs text-text-muted mb-1 font-medium">Explanation</p>
          <p className="text-text-secondary text-sm leading-relaxed">
            {explanation}
          </p>
        </div>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200"
        style={{
          backgroundColor: "var(--color-blue-accent)",
          color: "#ffffff",
        }}
      >
        {isLastQuestion ? "View Results" : "Next Question"}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
