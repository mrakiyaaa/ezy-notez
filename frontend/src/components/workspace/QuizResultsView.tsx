"use client";

import { useState, useEffect } from "react";
import { Loader2, RotateCcw, Plus, ArrowLeft, Trophy, Target } from "lucide-react";
import type { AttemptResults } from "@/types/quiz";
import type { AuraProps } from "./quiz/constants";
import { QUIZ_GREEN, QUIZ_RED, isPassing } from "./quiz/constants";
import { getAttemptResults } from "@/services/quiz.service";
import TeddyCompanion from "./quiz/TeddyCompanion";
import ScoreRing from "./quiz/ScoreRing";
import QuestionBreakdownItem from "./quiz/QuestionBreakdownItem";
import TopicBreakdownTags from "./quiz/TopicBreakdownTags";

interface QuizResultsViewProps extends AuraProps {
  quizId: string;
  attemptId: string;
  onRetake: (quizId: string) => void;
  onGenerateNew: () => void;
  onBack: () => void;
}

export default function QuizResultsView({
  quizId,
  attemptId,
  onRetake,
  onGenerateNew,
  onBack,
  auraHex,
  auraRgb,
  auraContrast,
}: QuizResultsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AttemptResults | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getAttemptResults(quizId, attemptId);
        if (mounted) {
          setResults(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load results"
          );
          setIsLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      mounted = false;
    };
  }, [quizId, attemptId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2
          className="w-8 h-8 animate-spin mb-4"
          style={{ color: auraHex }}
        />
        <p className="text-text-muted text-sm">Loading results…</p>
      </div>
    );
  }

  // Error state
  if (error || !results) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-6 py-4 text-center max-w-md">
          <p className="text-red-400 text-sm mb-3">
            {error || "Failed to load quiz results"}
          </p>
          <button
            onClick={onBack}
            className="text-text-secondary text-sm hover:text-text-primary transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const { attempt, quiz, questions, topic_breakdown } = results;
  const score = attempt.score ?? 0;
  const total = questions.length;
  const passed = isPassing(score, total);

  // Sort questions by position
  const sortedQuestions = [...questions].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 bg-bg-card/50 backdrop-blur-sm"
        style={{
          borderBottom: `1px solid rgba(${auraRgb}, 0.12)`,
        }}
      >
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition-colors p-1"
          aria-label="Back to quizzes"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-text-primary font-semibold truncate">
            Quiz Results
          </h2>
          <p className="text-text-muted text-sm truncate">{quiz.title}</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero score section */}
        <div
          className="relative py-12 px-6 flex flex-col items-center"
          style={{
            background: `linear-gradient(to bottom, rgba(${auraRgb}, 0.05) 0%, transparent 100%)`,
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(${auraRgb}, 0.1) 0%, transparent 50%)`,
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 max-w-3xl w-full">
            {/* Score ring — semantic pass/fail colors */}
            <ScoreRing score={score} total={total} size={180} />

            {/* Score text and bear */}
            <div className="flex flex-col items-center md:items-start gap-4 flex-1">
              {/* Pass/Fail indicator — semantic colors */}
              <div className="flex items-center gap-3">
                {passed ? (
                  <Trophy className="w-8 h-8" style={{ color: QUIZ_GREEN }} />
                ) : (
                  <Target className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: passed ? QUIZ_GREEN : QUIZ_RED }}
                  >
                    {passed ? "Congratulations!" : "Keep Practicing!"}
                  </h3>
                  <p className="text-text-muted text-sm">
                    {passed
                      ? "You passed this quiz!"
                      : "You need 60% or more to pass."}
                  </p>
                </div>
              </div>

              {/* Teddy companion */}
              <TeddyCompanion
                emotion={passed ? "celebrating" : "disappointed"}
                size={100}
              />
            </div>
          </div>
        </div>

        {/* Topic breakdown section */}
        {topic_breakdown.length > 0 && (
          <section className="px-6 py-6 border-b border-fade-border">
            <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: auraHex }}
              />
              Topic Performance
            </h3>
            <TopicBreakdownTags topics={topic_breakdown} />
          </section>
        )}

        {/* Question breakdown section */}
        <section className="px-6 py-6">
          <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: auraHex }}
            />
            Question Breakdown
          </h3>
          <div className="flex flex-col gap-4">
            {sortedQuestions.map((question, index) => {
              const answer = attempt.answers.find(
                (a) => a.question_id === question.id
              );
              return (
                <QuestionBreakdownItem
                  key={question.id}
                  question={question}
                  answer={answer}
                  questionNumber={index + 1}
                />
              );
            })}
          </div>
        </section>

        {/* Actions section */}
        <section className="px-6 py-8 flex flex-wrap gap-3 justify-center border-t border-fade-border bg-bg-card/30">
          <button
            onClick={() => onRetake(quizId)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: `rgba(${auraRgb}, 0.1)`,
              color: auraHex,
              border: `1px solid rgba(${auraRgb}, 0.25)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = auraHex;
              e.currentTarget.style.color = auraContrast;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.1)`;
              e.currentTarget.style.color = auraHex;
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Retake Quiz
          </button>

          <button
            onClick={onGenerateNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-fade-border text-text-secondary hover:text-text-primary hover:bg-white/5"
          >
            <Plus className="w-4 h-4" />
            Generate New Quiz
          </button>

          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-fade-border text-text-secondary hover:text-text-primary hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>
        </section>
      </div>
    </div>
  );
}
