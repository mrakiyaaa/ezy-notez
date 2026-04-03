"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  QuizWithQuestions,
  QuizAttempt,
  QuizQuestion,
  QuizAnswer,
} from "@/types/quiz";
import type { BearEmotion } from "@/components/workspace/quiz/constants";
import {
  getQuizQuestions,
  getOrCreateAttempt,
  submitAnswer,
  completeAttempt,
} from "@/services/quiz.service";

// Re-export BearEmotion for convenience
export type { BearEmotion };

interface UseQuizAttemptOptions {
  quizId: string;
  onComplete?: (attempt: QuizAttempt) => void;
  onError?: (error: string) => void;
}

interface UseQuizAttemptReturn {
  // State
  isLoading: boolean;
  error: string | null;
  quiz: QuizWithQuestions | null;
  attempt: QuizAttempt | null;
  currentQuestionIndex: number;
  currentQuestion: QuizQuestion | null;
  selectedOptionId: string | null;
  isSubmitting: boolean;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  bearEmotion: BearEmotion;

  // Actions
  selectOption: (optionId: string) => void;
  submitCurrentAnswer: () => Promise<void>;
  goToNextQuestion: () => void;
  exitAttempt: () => void;
}

export function useQuizAttempt({
  quizId,
  onComplete,
  onError,
}: UseQuizAttemptOptions): UseQuizAttemptReturn {
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  // Question navigation state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [bearEmotion, setBearEmotion] = useState<BearEmotion>("idle");

  const mountedRef = useRef(true);

  // Calculate the starting question index based on existing answers
  const calculateStartingIndex = useCallback(
    (questions: QuizQuestion[], answers: QuizAnswer[]): number => {
      if (answers.length === 0) return 0;

      // Find the first unanswered question
      const answeredIds = new Set(answers.map((a) => a.question_id));
      const firstUnanswered = questions.findIndex(
        (q) => !answeredIds.has(q.id)
      );

      // If all answered, return the last question
      return firstUnanswered >= 0 ? firstUnanswered : questions.length - 1;
    },
    []
  );

  // Initialize quiz and attempt on mount
  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch quiz with questions and get/create attempt in parallel
        const [quizData, attemptData] = await Promise.all([
          getQuizQuestions(quizId),
          getOrCreateAttempt(quizId),
        ]);

        if (!mountedRef.current) return;

        // Sort questions by position
        const sortedQuestions = [...quizData.questions].sort(
          (a, b) => a.position - b.position
        );
        quizData.questions = sortedQuestions;

        setQuiz(quizData);
        setAttempt(attemptData);

        // Calculate starting position based on existing answers
        const startIndex = calculateStartingIndex(
          sortedQuestions,
          attemptData.answers || []
        );
        setCurrentQuestionIndex(startIndex);

        // If attempt is already completed, trigger completion callback
        if (attemptData.status === "completed") {
          onComplete?.(attemptData);
        }

        setIsLoading(false);
      } catch (err) {
        if (!mountedRef.current) return;

        const errorMsg =
          err instanceof Error ? err.message : "Failed to load quiz";
        setError(errorMsg);
        setIsLoading(false);
        onError?.(errorMsg);
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [quizId, calculateStartingIndex, onComplete, onError]);

  // Derived state
  const currentQuestion = quiz?.questions[currentQuestionIndex] ?? null;
  const totalQuestions = quiz?.questions.length ?? 0;
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

  // Select an option
  const selectOption = useCallback((optionId: string) => {
    if (showFeedback) return; // Can't change selection after submission
    setSelectedOptionId(optionId);
    setBearEmotion("thinking");
  }, [showFeedback]);

  // Submit the current answer
  const submitCurrentAnswer = useCallback(async () => {
    if (!attempt || !currentQuestion || !selectedOptionId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedAttempt = await submitAnswer(attempt.id, {
        question_id: currentQuestion.id,
        selected_option_id: selectedOptionId,
      });

      if (!mountedRef.current) return;

      setAttempt(updatedAttempt);

      // Find the answer we just submitted
      const submittedAnswer = updatedAttempt.answers.find(
        (a) => a.question_id === currentQuestion.id
      );
      const isCorrect = submittedAnswer?.is_correct ?? false;

      setLastAnswerCorrect(isCorrect);
      setShowFeedback(true);
      setBearEmotion(isCorrect ? "happy" : "sad");

      setIsSubmitting(false);
    } catch (err) {
      if (!mountedRef.current) return;

      const errorMsg =
        err instanceof Error ? err.message : "Failed to submit answer";
      setError(errorMsg);
      setIsSubmitting(false);
      onError?.(errorMsg);
    }
  }, [attempt, currentQuestion, selectedOptionId, isSubmitting, onError]);

  // Go to the next question or complete the attempt
  const goToNextQuestion = useCallback(async () => {
    if (!attempt) return;

    if (isLastQuestion) {
      // Complete the attempt
      try {
        const completedAttempt = await completeAttempt(attempt.id);

        if (!mountedRef.current) return;

        setAttempt(completedAttempt);

        // Set bear emotion based on final score
        const score = completedAttempt.score ?? 0;
        const passed = totalQuestions > 0 && (score / totalQuestions) * 100 >= 60;
        setBearEmotion(passed ? "celebrating" : "disappointed");

        onComplete?.(completedAttempt);
      } catch (err) {
        if (!mountedRef.current) return;

        const errorMsg =
          err instanceof Error ? err.message : "Failed to complete quiz";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } else {
      // Move to next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setShowFeedback(false);
      setLastAnswerCorrect(null);
      setBearEmotion("idle");
    }
  }, [attempt, isLastQuestion, totalQuestions, onComplete, onError]);

  // Exit the attempt (used when user clicks X)
  const exitAttempt = useCallback(() => {
    // The attempt is already persisted, so we don't need to do anything special
    // Just reset local state
    setSelectedOptionId(null);
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setBearEmotion("idle");
  }, []);

  return {
    // State
    isLoading,
    error,
    quiz,
    attempt,
    currentQuestionIndex,
    currentQuestion,
    selectedOptionId,
    isSubmitting,
    showFeedback,
    lastAnswerCorrect,
    bearEmotion,

    // Actions
    selectOption,
    submitCurrentAnswer,
    goToNextQuestion,
    exitAttempt,
  };
}
