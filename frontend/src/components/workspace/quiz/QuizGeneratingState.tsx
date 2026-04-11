"use client";

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
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

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < GENERATION_STATUS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, MESSAGE_CYCLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <style>{`
        @keyframes quiz-pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(${auraRgb}, 0.2), 0 0 40px rgba(${auraRgb}, 0.08); }
          50%       { box-shadow: 0 0 32px rgba(${auraRgb}, 0.35), 0 0 64px rgba(${auraRgb}, 0.15); }
        }
        @keyframes quiz-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes quiz-pulse-icon {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>

      <div
        className="relative rounded-2xl border bg-bg-card p-4 flex items-center gap-4 w-72"
        style={{
          borderColor: `rgba(${auraRgb}, 0.3)`,
          animation: "quiz-pulse-glow 2s ease-in-out infinite",
        }}
      >
        {/* Spinning icon */}
        <div className="relative shrink-0">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: auraHex,
              borderRightColor: `rgba(${auraRgb}, 0.3)`,
              animation: "quiz-spin 1.5s linear infinite",
              width: "48px",
              height: "48px",
              margin: "-6px",
            }}
          />
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `rgba(${auraRgb}, 0.15)`,
              animation: "quiz-pulse-icon 2s ease-in-out infinite",
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: auraHex }} />
          </div>
        </div>

        {/* Text + dots */}
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-xs font-semibold mb-1">Generating Quiz</p>
          <p
            className="text-xs truncate transition-all duration-300"
            style={{ color: auraHex }}
          >
            {GENERATION_STATUS_MESSAGES[messageIndex]}
          </p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-2">
            {GENERATION_STATUS_MESSAGES.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i <= messageIndex ? auraHex : `rgba(${auraRgb}, 0.2)`,
                  transform: i === messageIndex ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="shrink-0 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
