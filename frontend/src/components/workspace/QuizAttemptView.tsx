"use client";

import { Loader2 } from "lucide-react";
import type { AuraProps } from "./quiz/constants";
import { useQuizAttempt } from "@/hooks/useQuizAttempt";
import AttemptTopBar from "./quiz/AttemptTopBar";
import TeddyCompanion from "./quiz/TeddyCompanion";
import QuestionCard from "./quiz/QuestionCard";
import OptionButton from "./quiz/OptionButton";
import AnswerFeedback from "./quiz/AnswerFeedback";

interface QuizAttemptViewProps extends AuraProps {
  quizId: string;
  onExit: () => void;
  onComplete: (quizId: string, attemptId: string) => void;
}

export default function QuizAttemptView({
  quizId,
  onExit,
  onComplete,
  auraHex,
  auraRgb,
  auraContrast,
}: QuizAttemptViewProps) {
  const auraProps = { auraHex, auraRgb, auraContrast };

  const {
    isLoading,
    error,
    quiz,
    currentQuestionIndex,
    currentQuestion,
    selectedOptionId,
    isSubmitting,
    showFeedback,
    lastAnswerCorrect,
    bearEmotion,
    selectOption,
    submitCurrentAnswer,
    goToNextQuestion,
    exitAttempt,
  } = useQuizAttempt({
    quizId,
    onComplete: (completedAttempt) => {
      // Delay slightly to show the celebrating/disappointed bear
      setTimeout(() => {
        onComplete(quizId, completedAttempt.id);
      }, 800);
    },
    onError: () => {},
  });

  const handleExit = () => {
    exitAttempt();
    onExit();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2
          className="w-8 h-8 animate-spin mb-4"
          style={{ color: auraHex }}
        />
        <p className="text-text-muted text-sm">Loading quiz…</p>
      </div>
    );
  }

  // Error state
  if (error || !quiz || !currentQuestion) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-6 py-4 text-center max-w-md">
          <p className="text-red-400 text-sm mb-3">
            {error || "Failed to load quiz questions"}
          </p>
          <button
            onClick={handleExit}
            className="text-text-secondary text-sm hover:text-text-primary transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const totalQuestions = quiz.questions.length;
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

  // Find correct answer text for feedback
  const correctOption = currentQuestion.options.find(
    (opt) => opt.id === currentQuestion.correct_option_id
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <AttemptTopBar
        quizTitle={quiz.title}
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={totalQuestions}
        onExit={handleExit}
        {...auraProps}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-8 gap-6">
        {/* Question card */}
        <QuestionCard
          questionNumber={currentQuestionIndex + 1}
          questionText={currentQuestion.question_text}
          questionType={currentQuestion.question_type}
          {...auraProps}
        />

        {/* Option buttons */}
        <div className="w-full max-w-2xl flex flex-col gap-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const isCorrectOption = option.id === currentQuestion.correct_option_id;
            const isWrongSelected =
              showFeedback && isSelected && !isCorrectOption;

            return (
              <OptionButton
                key={option.id}
                label={option.label}
                text={option.text}
                isSelected={isSelected}
                isCorrect={showFeedback && isCorrectOption}
                isWrong={isWrongSelected}
                isDisabled={isSubmitting}
                showResult={showFeedback}
                onSelect={() => selectOption(option.id)}
                {...auraProps}
              />
            );
          })}
        </div>

        {/* Submit button (only shown before feedback) */}
        {!showFeedback && (
          <button
            onClick={submitCurrentAnswer}
            disabled={!selectedOptionId || isSubmitting}
            className="w-full max-w-2xl py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor:
                selectedOptionId && !isSubmitting
                  ? auraHex
                  : `rgba(${auraRgb}, 0.15)`,
              color: selectedOptionId && !isSubmitting ? auraContrast : auraHex,
              boxShadow:
                selectedOptionId && !isSubmitting
                  ? `0 0 20px rgba(${auraRgb}, 0.3)`
                  : "none",
            }}
            onMouseEnter={(e) => {
              if (selectedOptionId && !isSubmitting) {
                e.currentTarget.style.boxShadow = `0 0 32px rgba(${auraRgb}, 0.45)`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedOptionId && !isSubmitting) {
                e.currentTarget.style.boxShadow = `0 0 20px rgba(${auraRgb}, 0.3)`;
              }
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </span>
            ) : (
              "Submit Answer"
            )}
          </button>
        )}

        {/* Feedback panel */}
        {showFeedback && lastAnswerCorrect !== null && (
          <AnswerFeedback
            isCorrect={lastAnswerCorrect}
            explanation={currentQuestion.explanation}
            correctAnswerText={
              !lastAnswerCorrect && correctOption
                ? `${correctOption.label}. ${correctOption.text}`
                : undefined
            }
            onNext={goToNextQuestion}
            isLastQuestion={isLastQuestion}
            {...auraProps}
          />
        )}
      </div>

      {/* Teddy companion — fixed floating at bottom-right of viewport */}
      <div className="fixed bottom-6 right-6 z-40 pointer-events-none">
        <TeddyCompanion emotion={bearEmotion} size={100} />
      </div>
    </div>
  );
}
