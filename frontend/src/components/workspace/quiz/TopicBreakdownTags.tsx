"use client";

import type { TopicBreakdown } from "@/types/quiz";
import { QUIZ_GREEN, QUIZ_GREEN_RGB, QUIZ_RED, QUIZ_RED_RGB, QUIZ_AMBER, QUIZ_AMBER_RGB } from "./constants";

interface TopicBreakdownTagsProps {
  topics: TopicBreakdown[];
}

export default function TopicBreakdownTags({ topics }: TopicBreakdownTagsProps) {
  if (topics.length === 0) {
    return null;
  }

  // Sort topics by accuracy (lowest first to highlight weak areas)
  const sortedTopics = [...topics].sort(
    (a, b) => a.accuracy_percentage - b.accuracy_percentage
  );

  const getTopicColor = (accuracy: number) => {
    if (accuracy >= 80) return QUIZ_GREEN;
    if (accuracy >= 60) return QUIZ_AMBER;
    return QUIZ_RED;
  };

  const getTopicBgColor = (accuracy: number) => {
    if (accuracy >= 80) return `rgba(${QUIZ_GREEN_RGB}, 0.1)`;
    if (accuracy >= 60) return `rgba(${QUIZ_AMBER_RGB}, 0.1)`;
    return `rgba(${QUIZ_RED_RGB}, 0.1)`;
  };

  const getTopicBorderColor = (accuracy: number) => {
    if (accuracy >= 80) return `rgba(${QUIZ_GREEN_RGB}, 0.3)`;
    if (accuracy >= 60) return `rgba(${QUIZ_AMBER_RGB}, 0.3)`;
    return `rgba(${QUIZ_RED_RGB}, 0.3)`;
  };

  // Identify weak topics (accuracy < 60%)
  const weakTopics = sortedTopics.filter((t) => t.accuracy_percentage < 60);

  return (
    <div className="flex flex-col gap-4">
      {/* Weak topics alert */}
      {weakTopics.length > 0 && (
        <div
          className="rounded-lg px-4 py-3 border"
          style={{
            backgroundColor: `rgba(${QUIZ_RED_RGB}, 0.05)`,
            borderColor: `rgba(${QUIZ_RED_RGB}, 0.2)`,
          }}
        >
          <p className="text-text-primary text-sm font-medium mb-1">
            📚 Areas to Review
          </p>
          <p className="text-text-muted text-xs">
            Focus on these topics to improve your understanding:{" "}
            {weakTopics.map((t) => t.topic_tag).join(", ")}
          </p>
        </div>
      )}

      {/* Topic tags grid */}
      <div className="flex flex-wrap gap-2">
        {sortedTopics.map((topic) => {
          const color = getTopicColor(topic.accuracy_percentage);
          const bgColor = getTopicBgColor(topic.accuracy_percentage);
          const borderColor = getTopicBorderColor(topic.accuracy_percentage);

          return (
            <div
              key={topic.topic_tag}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: bgColor,
                borderColor: borderColor,
              }}
            >
              {/* Topic name */}
              <span className="text-text-primary text-sm font-medium">
                {topic.topic_tag}
              </span>

              {/* Score badge */}
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  backgroundColor: `${color}20`,
                  color: color,
                }}
              >
                {topic.correct_answers}/{topic.total_questions}
              </span>

              {/* Accuracy percentage */}
              <span
                className="text-[10px] font-semibold"
                style={{ color }}
              >
                {Math.round(topic.accuracy_percentage)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
