"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Quiz, QuestionType } from "@/types/quiz";
import {
  generateQuiz,
  getQuizStatus,
} from "@/services/quiz.service";
import { POLLING_INTERVAL_MS } from "@/components/workspace/quiz/constants";

interface UseQuizGenerationOptions {
  workspaceId: string;
  onSuccess?: (quiz: Quiz) => void;
  onError?: (error: string) => void;
}

interface UseQuizGenerationReturn {
  isGenerating: boolean;
  pendingQuizId: string | null;
  error: string | null;
  generate: (
    resourceIds: string[],
    questionType: QuestionType,
    questionCount: number
  ) => Promise<void>;
  reset: () => void;
}

export function useQuizGeneration({
  workspaceId,
  onSuccess,
  onError,
}: UseQuizGenerationOptions): UseQuizGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingQuizId, setPendingQuizId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (quizId: string) => {
      stopPolling();

      pollIntervalRef.current = setInterval(async () => {
        try {
          const quiz = await getQuizStatus(quizId);

          if (!mountedRef.current) {
            stopPolling();
            return;
          }

          if (quiz.status === "ready") {
            stopPolling();
            setIsGenerating(false);
            setPendingQuizId(null);
            onSuccess?.(quiz);
          } else if (quiz.status === "failed") {
            stopPolling();
            setIsGenerating(false);
            setPendingQuizId(null);
            const errorMsg = quiz.error_message || "Quiz generation failed";
            setError(errorMsg);
            onError?.(errorMsg);
          }
          // Continue polling if still pending or processing
        } catch (err) {
          console.error("[useQuizGeneration] Polling error:", err);
          // Don't stop polling on transient errors
        }
      }, POLLING_INTERVAL_MS);
    },
    [stopPolling, onSuccess, onError]
  );

  const generate = useCallback(
    async (
      resourceIds: string[],
      questionType: QuestionType,
      questionCount: number
    ) => {
      if (isGenerating) return;

      setIsGenerating(true);
      setError(null);
      setPendingQuizId(null);

      try {
        const quiz = await generateQuiz(
          workspaceId,
          resourceIds,
          questionType,
          questionCount
        );

        if (!mountedRef.current) return;

        setPendingQuizId(quiz.id);

        // If already ready (unlikely but possible), call success immediately
        if (quiz.status === "ready") {
          setIsGenerating(false);
          setPendingQuizId(null);
          onSuccess?.(quiz);
        } else if (quiz.status === "failed") {
          setIsGenerating(false);
          setPendingQuizId(null);
          const errorMsg = quiz.error_message || "Quiz generation failed";
          setError(errorMsg);
          onError?.(errorMsg);
        } else {
          // Start polling for status updates
          startPolling(quiz.id);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        const errorMsg = err instanceof Error ? err.message : "Failed to generate quiz";
        setIsGenerating(false);
        setError(errorMsg);
        onError?.(errorMsg);
      }
    },
    [workspaceId, isGenerating, startPolling, onSuccess, onError]
  );

  const reset = useCallback(() => {
    stopPolling();
    setIsGenerating(false);
    setPendingQuizId(null);
    setError(null);
  }, [stopPolling]);

  return {
    isGenerating,
    pendingQuizId,
    error,
    generate,
    reset,
  };
}
