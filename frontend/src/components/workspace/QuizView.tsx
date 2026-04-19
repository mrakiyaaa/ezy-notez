"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpCircle, Plus, Search, Sparkles, X, Loader2 } from "lucide-react";
import type { QuizWithAttempt } from "@/types/quiz";
import { getQuizzes, deleteQuiz } from "@/services/quiz.service";
import { useQuizGeneration } from "@/hooks/useQuizGeneration";
import QuizCard from "./quiz/QuizCard";
import QuizConfigForm from "./quiz/QuizConfigForm";
import QuizGeneratingState from "./quiz/QuizGeneratingState";

interface QuizViewProps {
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
}: QuizViewProps) {
  const [quizzes, setQuizzes] = useState<QuizWithAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    isGenerating,
    generate,
    reset: resetGeneration,
  } = useQuizGeneration({
    workspaceId,
    onSuccess: (quiz) => {
      setQuizzes((prev) => [{ ...quiz, attempt: null }, ...prev]);
      setNotification({ message: "Quiz generated successfully!", success: true });
      setShowConfigForm(false);
      onStartAttempt?.(quiz.id);
    },
    onError: (errorMsg) => {
      setNotification({ message: errorMsg, success: false });
    },
  });

  const fetchQuizzes = useCallback(async () => {
    try {
      const data = await getQuizzes(workspaceId);
      setQuizzes(data);
    } catch (err) {
      console.error("[QuizView] Failed to fetch quizzes:", err);
      setNotification({
        message: err instanceof Error ? err.message : "Failed to load quizzes",
        success: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

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
        message: err instanceof Error ? err.message : "Failed to delete quiz",
        success: false,
      });
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleQuizzes = normalizedQuery
    ? quizzes.filter((q) => q.title.toLowerCase().includes(normalizedQuery))
    : quizzes;
  const inProgressQuizzes = visibleQuizzes.filter((q) => q.attempt?.status === "in_progress");
  const completedQuizzes = visibleQuizzes.filter((q) => q.attempt?.status === "completed");
  const newQuizzes = visibleQuizzes.filter((q) => !q.attempt);
  const hasAnyQuizzes = quizzes.length > 0;
  const hasVisibleQuizzes = visibleQuizzes.length > 0;

  return (
    <div className="relative flex flex-col h-full">
      {/* Notification banner */}
      {notification && (
        <div
          className={[
            "flex items-center justify-between px-5 py-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200 border-b",
            notification.success
              ? "bg-blue-accent/10 border-blue-accent/30 text-blue-accent"
              : "bg-white/3 border-red-500/30 text-text-secondary",
          ].join(" ")}
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
      <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 bg-blue-accent/10 border border-blue-accent/30 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-accent" />
            </div>
            <div>
              <h2 className="text-text-primary font-bold text-xl">Quiz Generator</h2>
              <p className="text-text-muted text-sm font-light">
                AI-generated quizzes to test your knowledge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasAnyQuizzes && (
              <div className="relative w-64 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quizzes by title"
                  className="w-full bg-bg-card border border-fade-border rounded-lg pl-10 pr-9 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-white/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setShowConfigForm((v) => !v)}
              className="bg-blue-accent text-white font-semibold text-sm rounded-lg px-5 py-2.5 flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Generate Quiz
            </button>
          </div>
        </div>

        {/* Config form panel */}
        {showConfigForm && (
          <QuizConfigForm
            workspaceId={workspaceId}
            isGenerating={isGenerating}
            onGenerate={generate}
            onClose={() => setShowConfigForm(false)}
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasAnyQuizzes && !showConfigForm && (
          <EmptyState onGenerate={() => setShowConfigForm(true)} />
        )}

        {/* No search results */}
        {!isLoading && hasAnyQuizzes && !hasVisibleQuizzes && (
          <div className="py-12 text-center text-text-muted text-sm">
            No quizzes match &quot;{searchQuery}&quot;.
          </div>
        )}

        {/* Quiz sections */}
        {!isLoading && hasVisibleQuizzes && (
          <div className="flex flex-col gap-8">
            {/* In-Progress Section */}
            {inProgressQuizzes.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.75 h-1.75 rounded-full bg-blue-accent" />
                  <h3 className="text-text-primary font-semibold text-sm">
                    Continue Where You Left Off
                  </h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {inProgressQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onContinue={onStartAttempt}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* New quizzes */}
            {newQuizzes.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.75 h-1.75 rounded-full bg-blue-accent" />
                  <h3 className="text-text-primary font-semibold text-sm">
                    Ready to Start
                  </h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {newQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onContinue={onStartAttempt}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Section */}
            {completedQuizzes.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.75 h-1.75 rounded-full bg-text-muted" />
                  <h3 className="text-text-primary font-semibold text-sm">
                    All Quizzes
                  </h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {completedQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onViewResults={onViewResults}
                      onRetake={onStartAttempt}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Floating generating state */}
      {isGenerating && <QuizGeneratingState onCancel={resetGeneration} />}
    </div>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 min-h-96">
      <div className="w-20 h-20 rounded-2xl bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center">
        <HelpCircle className="w-10 h-10 text-blue-accent" />
      </div>
      <div className="text-center">
        <h2 className="text-text-primary text-xl font-bold mb-2">No Quizzes Yet</h2>
        <p className="text-text-muted text-sm max-w-xs">
          Generate AI-powered quizzes from your workspace resources to test your knowledge.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-accent text-white hover:opacity-90 transition-opacity"
      >
        <Sparkles className="w-4 h-4" />
        Generate Your First Quiz
      </button>
    </div>
  );
}
