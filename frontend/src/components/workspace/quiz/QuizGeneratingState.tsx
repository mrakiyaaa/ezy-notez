"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import type { AuraProps } from "./constants";
import {
  GENERATION_STATUS_MESSAGES,
  MESSAGE_CYCLE_INTERVAL_MS,
} from "./constants";

interface QuizGeneratingStateProps extends AuraProps {
  onCancel?: () => void;
}

export default function QuizGeneratingState({ onCancel, auraHex, auraRgb }: QuizGeneratingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < GENERATION_STATUS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, MESSAGE_CYCLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Animated card with pulsing glow */}
      <div
        className="relative rounded-2xl border bg-bg-card p-10 flex flex-col items-center gap-6 max-w-md w-full"
        style={{
          borderColor: `rgba(${auraRgb}, 0.3)`,
          animation: "quiz-pulse-glow 2s ease-in-out infinite",
        }}
      >
        {/* Pulsing glow overlay */}
        <style>{`
          @keyframes quiz-pulse-glow {
            0%, 100% {
              box-shadow: 0 0 30px rgba(${auraRgb}, 0.15),
                          0 0 60px rgba(${auraRgb}, 0.08);
            }
            50% {
              box-shadow: 0 0 50px rgba(${auraRgb}, 0.25),
                          0 0 100px rgba(${auraRgb}, 0.15);
            }
          }
          @keyframes quiz-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes quiz-pulse-icon {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>

        {/* Animated icon container */}
        <div className="relative">
          {/* Rotating ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: auraHex,
              borderRightColor: `rgba(${auraRgb}, 0.3)`,
              animation: "quiz-spin 1.5s linear infinite",
              width: "80px",
              height: "80px",
              margin: "-8px",
            }}
          />
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `rgba(${auraRgb}, 0.15)`,
              animation: "quiz-pulse-icon 2s ease-in-out infinite",
            }}
          >
            <Sparkles className="w-8 h-8" style={{ color: auraHex }} />
          </div>
        </div>

        {/* Status message */}
        <div className="text-center">
          <h3 className="text-text-primary text-lg font-semibold mb-2">
            Generating Your Quiz
          </h3>
          <p
            className="text-sm font-medium transition-all duration-300"
            style={{ color: auraHex }}
          >
            {GENERATION_STATUS_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {GENERATION_STATUS_MESSAGES.map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  index <= messageIndex
                    ? auraHex
                    : `rgba(${auraRgb}, 0.2)`,
                transform: index === messageIndex ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors mt-2"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Help text */}
      <p className="text-text-muted text-xs mt-6 text-center max-w-sm">
        This usually takes 30-60 seconds depending on the amount of content.
      </p>
    </div>
  );
}
