"use client";

import { Check, X } from "lucide-react";
import type { QuizQuestion, QuizAnswer } from "@/types/quiz";
import { QUIZ_GREEN, QUIZ_GREEN_RGB, QUIZ_RED, QUIZ_RED_RGB } from "./constants";

interface QuestionBreakdownItemProps {
  question: QuizQuestion;
  answer: QuizAnswer | undefined;
  questionNumber: number;
}

export default function QuestionBreakdownItem({
  question,
  answer,
  questionNumber,
}: QuestionBreakdownItemProps) {
  const isCorrect = answer?.is_correct ?? false;
  const accentColor = isCorrect ? QUIZ_GREEN : QUIZ_RED;
  const accentRgb = isCorrect ? QUIZ_GREEN_RGB : QUIZ_RED_RGB;

  const selectedOption = question.options.find(
    (opt) => opt.id === answer?.selected_option_id
  );
  const correctOption = question.options.find(
    (opt) => opt.id === question.correct_option_id
  );

  return (
    <div
      className="rounded-xl border bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-5"
      style={{
        borderColor: `rgba(${accentRgb}, 0.2)`,
      }}
    >
      {/* Header with question number and status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `rgba(${accentRgb}, 0.12)`,
            }}
          >
            {isCorrect ? (
              <Check className="w-4 h-4" style={{ color: accentColor }} />
            ) : (
              <X className="w-4 h-4" style={{ color: accentColor }} />
            )}
          </div>

          {/* Question number */}
          <span className="text-text-muted text-sm">
            Question {questionNumber}
          </span>
        </div>

        {/* Topic tag */}
        {question.topic_tag && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-fade-border)",
            }}
          >
            {question.topic_tag}
          </span>
        )}
      </div>

      {/* Question text */}
      <p className="text-text-primary text-sm mb-4 leading-relaxed">
        {question.question_text}
      </p>

      {/* Answer comparison */}
      <div className="flex flex-col gap-2 mb-4">
        {/* User's answer */}
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-xs w-24 shrink-0">Your answer:</span>
          <span
            className="text-sm"
            style={{
              color: isCorrect ? QUIZ_GREEN : QUIZ_RED,
            }}
          >
            {selectedOption
              ? `${selectedOption.label}. ${selectedOption.text}`
              : "Not answered"}
          </span>
        </div>

        {/* Correct answer (only show if wrong) */}
        {!isCorrect && correctOption && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-xs w-24 shrink-0">Correct answer:</span>
            <span className="text-sm" style={{ color: QUIZ_GREEN }}>
              {correctOption.label}. {correctOption.text}
            </span>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div
        className="rounded-lg px-4 py-3"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--color-fade-border)",
        }}
      >
        <p className="text-text-muted text-xs mb-1">Explanation</p>
        <p className="text-text-secondary text-sm leading-relaxed">
          {question.explanation}
        </p>
      </div>
    </div>
  );
}
