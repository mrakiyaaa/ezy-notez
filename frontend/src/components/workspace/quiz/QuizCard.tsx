"use client";

import { Trash2, Play, Eye, RotateCcw, Calendar, FileText } from "lucide-react";
import type { QuizWithAttempt } from "@/types/quiz";
import type { AuraProps } from "./constants";
import {
  QUIZ_GREEN,
  QUIZ_GREEN_RGB,
  QUIZ_AMBER,
  QUIZ_AMBER_RGB,
  QUIZ_AMBER_CONTRAST,
  QUIZ_RED,
  QUIZ_RED_RGB,
  formatQuizDate,
  formatProgress,
  calculateProgressPercentage,
  isPassing,
  getQuestionTypeLabel,
} from "./constants";

interface QuizCardProps extends AuraProps {
  quiz: QuizWithAttempt;
  onContinue?: (quizId: string) => void;
  onViewResults?: (quizId: string, attemptId: string) => void;
  onRetake?: (quizId: string) => void;
  onDelete?: (quizId: string) => void;
}

export default function QuizCard({
  quiz,
  onContinue,
  onViewResults,
  onRetake,
  onDelete,
  auraHex,
  auraRgb,
  auraContrast,
}: QuizCardProps) {
  const attempt = quiz.attempt;
  const isInProgress = attempt?.status === "in_progress";
  const isCompleted = attempt?.status === "completed";

  // Calculate progress for in-progress quizzes
  const answeredCount = attempt?.answers?.length ?? 0;
  const totalQuestions = quiz.question_count;
  const progressPct = calculateProgressPercentage(answeredCount, totalQuestions);

  // Score for completed quizzes
  const score = attempt?.score ?? 0;
  const passed = isPassing(score, totalQuestions);

  // In-progress uses amber, new/completed uses aura for chrome
  const accentColor = isInProgress ? QUIZ_AMBER : auraHex;
  const accentRgb = isInProgress ? QUIZ_AMBER_RGB : auraRgb;

  const handleContinue = () => {
    onContinue?.(quiz.id);
  };

  const handleViewResults = () => {
    if (attempt) {
      onViewResults?.(quiz.id, attempt.id);
    }
  };

  const handleRetake = () => {
    onRetake?.(quiz.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(quiz.id);
  };

  return (
    <div
      className="group rounded-xl border border-fade-border bg-bg-card p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "none" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 28px rgba(${accentRgb}, 0.14)`;
        e.currentTarget.style.borderColor = `rgba(${accentRgb}, 0.3)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "";
      }}
    >
      {/* Header row with title and delete button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary text-sm font-semibold leading-snug line-clamp-2">
            {quiz.title}
          </h3>
        </div>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="shrink-0 p-1.5 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
            aria-label="Delete quiz"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status badge and question type */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status badge */}
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: `rgba(${accentRgb}, 0.12)`,
            color: accentColor,
          }}
        >
          {isInProgress ? "In Progress" : isCompleted ? "Completed" : "New"}
        </span>

        {/* Question type badge */}
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            color: "var(--color-text-secondary)",
          }}
        >
          {getQuestionTypeLabel(quiz.question_type)}
        </span>

        {/* Score badge for completed quizzes — semantic green/red */}
        {isCompleted && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            style={{
              backgroundColor: passed
                ? `rgba(${QUIZ_GREEN_RGB}, 0.15)`
                : `rgba(${QUIZ_RED_RGB}, 0.15)`,
              color: passed ? QUIZ_GREEN : QUIZ_RED,
            }}
          >
            {score} / {totalQuestions}
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-muted text-xs truncate">
            {quiz.source_ids.length} resource{quiz.source_ids.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-muted text-xs">
            {formatQuizDate(quiz.created_at)}
          </span>
        </div>
      </div>

      {/* Progress bar for in-progress quizzes */}
      {isInProgress && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs">
              {formatProgress(answeredCount, totalQuestions)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
        </div>
      )}

      {/* Pass/fail indicator for completed quizzes — semantic green/red */}
      {isCompleted && (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: passed ? QUIZ_GREEN : QUIZ_RED }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: passed ? QUIZ_GREEN : QUIZ_RED }}
          >
            {passed ? "Passed" : "Failed"}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto">
        {isInProgress && (
          <button
            onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: `rgba(${QUIZ_AMBER_RGB}, 0.1)`,
              color: QUIZ_AMBER,
              border: `1px solid rgba(${QUIZ_AMBER_RGB}, 0.2)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = QUIZ_AMBER;
              e.currentTarget.style.color = QUIZ_AMBER_CONTRAST;
              e.currentTarget.style.borderColor = QUIZ_AMBER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(${QUIZ_AMBER_RGB}, 0.1)`;
              e.currentTarget.style.color = QUIZ_AMBER;
              e.currentTarget.style.borderColor = `rgba(${QUIZ_AMBER_RGB}, 0.2)`;
            }}
          >
            <Play className="w-3.5 h-3.5" />
            Continue
          </button>
        )}

        {isCompleted && (
          <>
            <button
              onClick={handleViewResults}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: `rgba(${auraRgb}, 0.1)`,
                color: auraHex,
                border: `1px solid rgba(${auraRgb}, 0.2)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = auraHex;
                e.currentTarget.style.color = auraContrast;
                e.currentTarget.style.borderColor = auraHex;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.1)`;
                e.currentTarget.style.color = auraHex;
                e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.2)`;
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              View Results
            </button>
            <button
              onClick={handleRetake}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 border border-fade-border text-text-secondary hover:text-text-primary hover:bg-white/5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {!attempt && (
          <button
            onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: `rgba(${auraRgb}, 0.1)`,
              color: auraHex,
              border: `1px solid rgba(${auraRgb}, 0.2)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = auraHex;
              e.currentTarget.style.color = auraContrast;
              e.currentTarget.style.borderColor = auraHex;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.1)`;
              e.currentTarget.style.color = auraHex;
              e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.2)`;
            }}
          >
            <Play className="w-3.5 h-3.5" />
            Start Quiz
          </button>
        )}
      </div>
    </div>
  );
}
