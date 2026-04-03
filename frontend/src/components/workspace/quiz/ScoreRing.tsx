"use client";

import { QUIZ_GREEN, QUIZ_GREEN_RGB, QUIZ_RED, QUIZ_RED_RGB } from "./constants";

interface ScoreRingProps {
  score: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export default function ScoreRing({
  score,
  total,
  size = 180,
  strokeWidth = 12,
}: ScoreRingProps) {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const passed = percentage >= 60;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const accentColor = passed ? QUIZ_GREEN : QUIZ_RED;
  const accentRgb = passed ? QUIZ_GREEN_RGB : QUIZ_RED_RGB;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          backgroundColor: `rgba(${accentRgb}, 0.15)`,
          transform: "scale(1.1)",
        }}
      />

      {/* SVG Ring */}
      <svg
        width={size}
        height={size}
        className="relative transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 1s ease-out",
            filter: `drop-shadow(0 0 8px ${accentColor})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color: accentColor }}
        >
          {score}
        </span>
        <span className="text-text-muted text-sm">
          out of {total}
        </span>
        <span
          className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `rgba(${accentRgb}, 0.15)`,
            color: accentColor,
          }}
        >
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
