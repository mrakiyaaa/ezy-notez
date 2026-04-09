"use client";

import type { AuraProps } from "./constants";

interface QuestionCardProps extends AuraProps {
  questionNumber: number;
  questionText: string;
  questionType: "mcq" | "scenario";
}

export default function QuestionCard({
  questionNumber,
  questionText,
  questionType,
  auraHex,
  auraRgb,
}: QuestionCardProps) {
  return (
    <div
      className="rounded-xl border bg-bg-card/80 backdrop-blur-sm p-6 w-full max-w-2xl"
      style={{
        borderColor: `rgba(${auraRgb}, 0.15)`,
        boxShadow: `0 4px 24px rgba(0, 0, 0, 0.2), 0 0 40px rgba(${auraRgb}, 0.05)`,
      }}
    >
      {/* Question header */}
      <div className="flex items-center gap-3 mb-4">
        {/* Question number badge */}
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: `rgba(${auraRgb}, 0.12)`,
            color: auraHex,
          }}
        >
          {questionNumber}
        </span>

        {/* Question type badge */}
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-fade-border)",
          }}
        >
          {questionType === "mcq" ? "Multiple Choice" : "Scenario"}
        </span>
      </div>

      {/* Question text */}
      <p className="text-text-primary text-lg leading-relaxed">
        {questionText}
      </p>
    </div>
  );
}
