"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Sparkles, X, Loader2 } from "lucide-react";
import type { QuizWithAttempt } from "@/types/quiz";
import type { AuraProps } from "./quiz/constants";
import { QUIZ_AMBER, QUIZ_RED_RGB } from "./quiz/constants";
import { getQuizzes, deleteQuiz } from "@/services/quiz.service";
import { useQuizGeneration } from "@/hooks/useQuizGeneration";
import QuizCard from "./quiz/QuizCard";
import QuizConfigForm from "./quiz/QuizConfigForm";
import QuizGeneratingState from "./quiz/QuizGeneratingState";

interface QuizViewProps extends AuraProps {
  workspaceId: string;
  onStartAttempt?: (quizId: string) => void;
  onViewResults?: (quizId: string, attemptId: string) => void;
}

interface Notification {
  message: string;
  success: boolean;
}

export default function QuizView({
  workspaceId,
  onStartAttempt,
  onViewResults,
  auraHex,
  auraRgb,
  auraContrast,
}: QuizViewProps) {
  const auraProps = { auraHex, auraRgb, auraContrast };

  const [quizzes, setQuizzes] = useState<QuizWithAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Quiz generation hook
  const {
    isGenerating,
    generate,
    reset: resetGeneration,
  } = useQuizGeneration({
    workspaceId,
    onSuccess: (quiz) => {
      // Add the new quiz to the list
      setQuizzes((prev) => [
        { ...quiz, attempt: null },
        ...prev,
      ]);
      setNotification({ message: "Quiz generated successfully!", success: true });
      setShowConfigForm(false);

      // Automatically start the attempt
      onStartAttempt?.(quiz.id);
    },
    onError: (errorMsg) => {
      setNotification({ message: errorMsg, success: false });
    },
  });

  // Fetch quizzes on mount
  const fetchQuizzes = useCallback(async () => {
    try {
      const data = await getQuizzes(workspaceId);
      setQuizzes(data);
    } catch (err) {
      console.error("[QuizView] Failed to fetch quizzes:", err);
      setNotification({
        message:
          err instanceof Error ? err.message : "Failed to load quizzes",
        success: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(t);
  }, [notification]);

  const handleDelete = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setNotification({ message: "Quiz deleted", success: true });
    } catch (err) {
      console.error("[QuizView] Failed to delete quiz:", err);
      setNotification({
        message:
          err instanceof Error ? err.message : "Failed to delete quiz",
        success: false,
      });
    }
  };

  // Separate quizzes into in-progress and completed
  const inProgressQuizzes = quizzes.filter(
    (q) => q.attempt?.status === "in_progress"
  );
  const completedQuizzes = quizzes.filter(
    (q) => q.attempt?.status === "completed"
  );
  const newQuizzes = quizzes.filter((q) => !q.attempt);

  const hasAnyQuizzes = quizzes.length > 0;

  // Show generating state
  if (isGenerating) {
    return (
      <div className="flex flex-col h-full">
        <QuizGeneratingState onCancel={resetGeneration} {...auraProps} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Notification banner */}
      {notification && (
        <div
          className="flex items-center justify-between px-5 py-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            backgroundColor: notification.success
              ? `rgba(${auraRgb}, 0.1)`
              : "rgba(255,255,255,0.03)",
            borderBottom: notification.success
              ? `1px solid rgba(${auraRgb}, 0.12)`
              : `1px solid rgba(${QUIZ_RED_RGB}, 0.12)`,
            color: notification.success
              ? auraHex
              : "var(--color-text-secondary)",
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
            >
              <ClipboardList className="w-5 h-5" style={{ color: auraHex }} />
            </div>
            <div>
              <h2 className="text-text-primary text-lg font-semibold">
                Quizzes
              </h2>
              <p className="text-text-muted text-sm">
                AI-generated quizzes to test your knowledge
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowConfigForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: showConfigForm
                ? auraHex
                : `rgba(${auraRgb}, 0.1)`,
              color: showConfigForm ? auraContrast : auraHex,
              border: `1px solid rgba(${auraRgb}, 0.25)`,
            }}
            onMouseEnter={(e) => {
              if (!showConfigForm)
                e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.2)`;
            }}
            onMouseLeave={(e) => {
              if (!showConfigForm)
                e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.1)`;
            }}
          >
            <Plus className="w-4 h-4" />
            Generate Quiz
          </button>
        </div>

        {/* Config form panel */}
        {showConfigForm && (
          <QuizConfigForm
            workspaceId={workspaceId}
            isGenerating={isGenerating}
            onGenerate={generate}
            onClose={() => setShowConfigForm(false)}
            {...auraProps}
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: auraHex }}
            />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasAnyQuizzes && !showConfigForm && (
          <EmptyState
            onGenerate={() => setShowConfigForm(true)}
            auraHex={auraHex}
            auraRgb={auraRgb}
            auraContrast={auraContrast}
          />
        )}

        {/* Quiz sections */}
        {!isLoading && hasAnyQuizzes && (
          <div className="flex flex-col gap-8">
            {/* In-Progress Section */}
            {inProgressQuizzes.length > 0 && (
              <section>
                <h3 className="text-text-primary text-base font-semibold mb-4 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: QUIZ_AMBER }}
                  />
                  Continue Where You Left Off
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inProgressQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onContinue={onStartAttempt}
                      onDelete={handleDelete}
                      {...auraProps}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* New quizzes (ready but not started) */}
            {newQuizzes.length > 0 && (
              <section>
                <h3 className="text-text-primary text-base font-semibold mb-4 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: auraHex }}
                  />
                  Ready to Start
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {newQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onContinue={onStartAttempt}
                      onDelete={handleDelete}
                      {...auraProps}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Section */}
            {completedQuizzes.length > 0 && (
              <section>
                <h3 className="text-text-primary text-base font-semibold mb-4 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: auraHex }}
                  />
                  Past Quizzes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {completedQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onViewResults={onViewResults}
                      onRetake={onStartAttempt}
                      onDelete={handleDelete}
                      {...auraProps}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({
  onGenerate,
  auraHex,
  auraRgb,
  auraContrast,
}: {
  onGenerate: () => void;
  auraHex: string;
  auraRgb: string;
  auraContrast: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 relative overflow-hidden min-h-[400px]">
      {/* Dot-grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(${auraRgb}, 0.25) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.35,
        }}
      />

      {/* Radial glow behind icon */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${auraRgb}, 0.08) 0%, transparent 68%)`,
        }}
      />

      {/* Icon */}
      <div
        className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          backgroundColor: `rgba(${auraRgb}, 0.12)`,
          boxShadow: `0 0 48px rgba(${auraRgb}, 0.22)`,
          border: `1px solid rgba(${auraRgb}, 0.22)`,
        }}
      >
        <ClipboardList className="w-10 h-10" style={{ color: auraHex }} />
      </div>

      {/* Copy */}
      <div className="relative z-10 text-center">
        <h2 className="text-text-primary text-xl font-bold mb-2">
          No Quizzes Yet
        </h2>
        <p className="text-text-muted text-sm max-w-xs">
          Generate AI-powered quizzes from your workspace resources to test
          your knowledge.
        </p>
      </div>

      {/* CTA button */}
      <button
        onClick={onGenerate}
        className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
        style={{
          backgroundColor: auraHex,
          color: auraContrast,
          boxShadow: `0 0 28px rgba(${auraRgb}, 0.42)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 44px rgba(${auraRgb}, 0.64)`;
          e.currentTarget.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 0 28px rgba(${auraRgb}, 0.42)`;
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Sparkles className="w-4 h-4" />
        Generate Your First Quiz
      </button>
    </div>
  );
}
