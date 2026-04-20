"use client";

import { Trash2, Play, Eye, Calendar, FileText } from "lucide-react";
import type { QuizWithAttempt } from "@/types/quiz";
import {
  formatQuizDate,
  formatProgress,
  calculateProgressPercentage,
  getQuestionTypeLabel,
} from "./constants";

interface QuizCardProps {
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
  onDelete,
}: QuizCardProps) {
  const attempt = quiz.attempt;
  const isInProgress = attempt?.status === "in_progress";
  const isCompleted = attempt?.status === "completed";

  const answeredCount = attempt?.answers?.length ?? 0;
  const totalQuestions = quiz.question_count;
  const progressPct = calculateProgressPercentage(
    isCompleted ? totalQuestions : answeredCount,
    totalQuestions
  );

  const handleAction = () => {
    if (isCompleted && attempt) {
      onViewResults?.(quiz.id, attempt.id);
    } else {
      onContinue?.(quiz.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(quiz.id);
  };

  // Accent bar color
  const accentBar = isInProgress
    ? "bg-amber-400/85"
    : isCompleted
    ? "bg-green-500/70"
    : "bg-blue-accent/40";

  // Progress bar fill color
  const progressFill = isInProgress
    ? "bg-amber-400"
    : isCompleted
    ? "bg-green-500"
    : "bg-blue-accent";

  return (
    <div className="w-96 shrink-0 bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl p-4.5 flex flex-col gap-3 relative overflow-hidden hover:border-blue-accent/20 transition-colors">
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.75 rounded-r ${accentBar}`} />

      {/* Title */}
      <h3 className="text-text-primary font-semibold text-[13px] leading-snug line-clamp-2 pl-1">
        {quiz.title}
      </h3>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Status badge */}
        <span
          className={[
            "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
            isInProgress
              ? "bg-amber-400/15 text-amber-400"
              : isCompleted
              ? "bg-green-500/12 text-green-400"
              : "bg-blue-accent/12 text-blue-accent",
          ].join(" ")}
        >
          {isInProgress ? "In Progress" : isCompleted ? "Completed" : "New"}
        </span>

        {/* Type badge */}
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/6 text-text-muted">
          {getQuestionTypeLabel(quiz.question_type)}
        </span>
      </div>

      {/* Meta rows */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <FileText className="w-3 h-3 shrink-0" />
          <span>
            {quiz.source_ids.length} resource{quiz.source_ids.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{formatQuizDate(quiz.created_at)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px] text-text-muted">
          <span>{formatProgress(isCompleted ? totalQuestions : answeredCount, totalQuestions)}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/6">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Action row */}
      <div className="flex gap-2 mt-auto">
        {/* Primary action */}
        <button
          onClick={handleAction}
          className={[
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
            isInProgress
              ? "bg-amber-400/12 text-amber-400 hover:bg-amber-400/20"
              : isCompleted
              ? "bg-green-500/10 text-green-400 hover:bg-green-500/18"
              : "bg-blue-accent/10 text-text-secondary hover:bg-blue-accent/20",
          ].join(" ")}
        >
          {isCompleted ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              Review
            </>
          ) : isInProgress ? (
            <>
              <Play className="w-3.5 h-3.5" />
              Continue
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Start Quiz
            </>
          )}
        </button>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="w-8 h-8 shrink-0 bg-main border-white/[0.08] rounded-md flex items-center justify-center text-text-muted hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-150"
            aria-label="Delete quiz"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
