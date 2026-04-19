"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { StudyRoomResults as ResultsType, LeaderboardEntry, Badge, WrongAnswer } from "@/types/studyRoom";
import { getResults, getInsights } from "@/services/studyRoom.service";
import {
  popIn,
  resultStaggerContainer,
  resultStaggerItem,
} from "@/lib/animations";

interface StudyRoomResultsProps {
  roomId: string;
  onBack: () => void;
}

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const medals: Record<number, { bg: string; border: string; text: string }> = {
    0: { bg: "rgba(255, 215, 0, 0.12)", border: "rgba(255, 215, 0, 0.4)", text: "#ffd700" },
    1: { bg: "rgba(192, 192, 192, 0.12)", border: "rgba(192, 192, 192, 0.4)", text: "#c0c0c0" },
    2: { bg: "rgba(205, 127, 50, 0.12)", border: "rgba(205, 127, 50, 0.4)", text: "#cd7f32" },
  };

  const medal = medals[index];
  const initials = entry.name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <motion.div
      variants={resultStaggerItem}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all duration-200 ${
        medal
          ? ""
          : "border-fade-border bg-white/[0.02]"
      }`}
      style={
        medal
          ? {
              backgroundColor: medal.bg,
              borderColor: medal.border,
            }
          : undefined
      }
    >
      {/* Position */}
      <motion.span
        variants={popIn}
        initial="initial"
        animate="animate"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
        style={
          medal
            ? { backgroundColor: medal.border, color: "#000" }
            : { backgroundColor: "rgba(255,255,255,0.06)", color: "var(--color-text-muted)" }
        }
      >
        {entry.position}
      </motion.span>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-blue-accent/20 border border-blue-accent/30 flex items-center justify-center shrink-0">
        {entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.avatar_url}
            alt={entry.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-blue-accent">
            {initials || "?"}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="flex-1 text-text-primary text-sm font-medium truncate">
        {entry.name}
      </span>

      {/* Points */}
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: medal?.text ?? "var(--color-text-secondary)" }}
      >
        {entry.points} pts
      </span>
    </motion.div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <motion.div
      variants={resultStaggerItem}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-fade-border bg-white/[0.02]"
    >
      <motion.span variants={popIn} initial="initial" animate="animate" className="text-2xl">
        {badge.icon}
      </motion.span>
      <span className="text-text-secondary text-sm font-medium">
        {badge.label}
      </span>
    </motion.div>
  );
}

function WrongAnswerCard({ item }: { item: WrongAnswer }) {
  const optionLabels = ["A", "B", "C", "D"];

  return (
    <motion.div
      variants={resultStaggerItem}
      className="rounded-xl border border-fade-border bg-bg-card/60 backdrop-blur-sm p-5"
    >
      {/* Question */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-xs font-bold text-text-muted">
          {item.question_number}
        </span>
        <p className="text-text-primary text-sm font-medium flex-1">
          {item.question_text}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-3">
        {item.options.map((opt, i) => {
          const isSelected = i === item.selected_answer;
          const isCorrect = i === item.correct_answer;

          let borderColor = "var(--color-fade-border)";
          let bgColor = "transparent";
          let textColor = "var(--color-text-muted)";

          if (isCorrect) {
            borderColor = "#22c55e";
            bgColor = "rgba(34, 197, 94, 0.08)";
            textColor = "#22c55e";
          } else if (isSelected) {
            borderColor = "#ef4444";
            bgColor = "rgba(239, 68, 68, 0.08)";
            textColor = "#ef4444";
          }

          return (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor, backgroundColor: bgColor, color: textColor }}
            >
              <span className="font-bold text-xs w-5">{optionLabels[i]}</span>
              <span className="flex-1">{opt}</span>
              {isCorrect && <span className="text-xs font-medium">Correct</span>}
              {isSelected && !isCorrect && (
                <span className="text-xs font-medium">Your Answer</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="rounded-lg bg-blue-accent/5 border border-blue-accent/15 px-3 py-2">
        <p className="text-text-secondary text-xs leading-relaxed">
          <span className="text-blue-accent font-medium">Explanation: </span>
          {item.explanation}
        </p>
      </div>
    </motion.div>
  );
}

export default function StudyRoomResults({ roomId, onBack }: StudyRoomResultsProps) {
  const [results, setResults] = useState<ResultsType | null>(null);
  const [insights, setInsights] = useState<string>("Generating insights...");
  const [showRevision, setShowRevision] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getResults(roomId)
      .then(setResults)
      .catch(console.error)
      .finally(() => setIsLoading(false));

    getInsights(roomId)
      .then((data) => setInsights(data.insights))
      .catch(console.error);
  }, [roomId]);

  if (isLoading || !results) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-blue-accent/15 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-blue-accent" />
        </div>
        <h2 className="text-text-primary text-2xl font-semibold">
          {results.room_title}
        </h2>
        <p className="text-text-muted text-sm mt-1">Final Results</p>
      </div>

      {/* Leaderboard */}
      <section className="mb-8">
        <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide mb-4">
          Leaderboard
        </h3>
        <motion.div
          className="space-y-2"
          variants={resultStaggerContainer}
          initial="initial"
          animate="animate"
        >
          {results.leaderboard.map((entry, i) => (
            <LeaderboardRow key={entry.user_id} entry={entry} index={i} />
          ))}
        </motion.div>
      </section>

      {/* Badges */}
      <section className="mb-8">
        <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide mb-4">
          Badges Earned
        </h3>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          variants={resultStaggerContainer}
          initial="initial"
          animate="animate"
        >
          {results.badges.map((badge, i) => (
            <BadgeCard key={`${badge.type}-${i}`} badge={badge} />
          ))}
        </motion.div>
      </section>

      {/* AI Insights */}
      <section className="mb-8">
        <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide mb-4">
          AI Insights
        </h3>
        <div className="rounded-xl border border-blue-accent/30 bg-blue-accent/5 backdrop-blur-sm p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-accent shrink-0 mt-0.5" />
            <p className="text-text-secondary text-sm leading-relaxed">
              {insights}
            </p>
          </div>
        </div>
      </section>

      {/* Revision Mode Toggle */}
      <section className="mb-8">
        <button
          onClick={() => setShowRevision((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-fade-border bg-bg-card/60 w-full text-left hover:bg-white/[0.03] transition-colors"
        >
          <span className="flex-1 text-text-secondary text-sm font-medium">
            Review Wrong Answers
            {results.wrong_answers.length > 0 && (
              <span className="ml-2 text-text-muted text-xs">
                ({results.wrong_answers.length})
              </span>
            )}
          </span>
          {showRevision ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </button>

        {showRevision && (
          <motion.div
            className="mt-4 space-y-4"
            variants={resultStaggerContainer}
            initial="initial"
            animate="animate"
          >
            {results.wrong_answers.length > 0 ? (
              results.wrong_answers.map((wa, i) => (
                <WrongAnswerCard key={i} item={wa} />
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-text-muted text-sm">
                  Perfect score! No wrong answers to review.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </section>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-3 rounded-lg border border-fade-border bg-white/[0.04] text-text-secondary text-sm font-medium hover:bg-white/[0.08] transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Study Room
      </button>
    </div>
  );
}
