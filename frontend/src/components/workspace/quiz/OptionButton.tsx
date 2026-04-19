"use client";

import { Check, X } from "lucide-react";
import { QUIZ_GREEN, QUIZ_GREEN_RGB, QUIZ_GREEN_CONTRAST, QUIZ_RED, QUIZ_RED_RGB, QUIZ_RED_CONTRAST } from "./constants";

interface OptionButtonProps {
  label: string; // A, B, C, D
  text: string;
  isSelected: boolean;
  isCorrect?: boolean; // Only set after submission
  isWrong?: boolean; // Only set after submission (selected but incorrect)
  isDisabled?: boolean;
  showResult?: boolean; // Whether to show correct/wrong state
  onSelect: () => void;
}

export default function OptionButton({
  label,
  text,
  isSelected,
  isCorrect,
  isWrong,
  isDisabled = false,
  showResult = false,
  onSelect,
}: OptionButtonProps) {
  const getStyles = () => {
    // Post-submission: keep semantic green/red for correct/wrong
    if (showResult) {
      if (isCorrect) {
        return {
          backgroundColor: `rgba(${QUIZ_GREEN_RGB}, 0.12)`,
          borderColor: QUIZ_GREEN,
          labelBg: QUIZ_GREEN,
          labelColor: QUIZ_GREEN_CONTRAST,
          textColor: "var(--color-text-primary)",
          boxShadow: `0 0 16px rgba(${QUIZ_GREEN_RGB}, 0.2)`,
          icon: <Check className="w-4 h-4" />,
        };
      }
      if (isWrong) {
        return {
          backgroundColor: `rgba(${QUIZ_RED_RGB}, 0.12)`,
          borderColor: QUIZ_RED,
          labelBg: QUIZ_RED,
          labelColor: QUIZ_RED_CONTRAST,
          textColor: "var(--color-text-primary)",
          boxShadow: `0 0 16px rgba(${QUIZ_RED_RGB}, 0.2)`,
          icon: <X className="w-4 h-4" />,
        };
      }
      // Unselected option after submission
      return {
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderColor: "var(--color-fade-border)",
        labelBg: "rgba(255, 255, 255, 0.1)",
        labelColor: "var(--color-text-muted)",
        textColor: "var(--color-text-muted)",
        boxShadow: "none",
        icon: null,
      };
    }

    // Pre-submission selected: use blue-accent
    if (isSelected) {
      return {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderColor: "var(--color-blue-accent)",
        labelBg: "rgba(255, 255, 255, 0.08)",
        labelColor: "var(--color-blue-accent)",
        textColor: "var(--color-text-primary)",
        boxShadow: "none",
        icon: null,
      };
    }

    return {
      backgroundColor: "rgba(255, 255, 255, 0.02)",
      borderColor: "var(--color-fade-border)",
      labelBg: "rgba(255, 255, 255, 0.08)",
      labelColor: "var(--color-text-secondary)",
      textColor: "var(--color-text-secondary)",
      boxShadow: "none",
      icon: null,
    };
  };

  const styles = getStyles();

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled || showResult}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all duration-200 text-left group"
      style={{
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        boxShadow: styles.boxShadow,
        cursor: isDisabled || showResult ? "default" : "pointer",
        opacity: isDisabled && !showResult ? 0.6 : 1,
      }}
    >
      {/* Option label (A, B, C, D) */}
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200"
        style={{
          backgroundColor: styles.labelBg,
          color: styles.labelColor,
        }}
      >
        {styles.icon || label}
      </span>

      {/* Option text */}
      <span
        className="flex-1 text-sm leading-relaxed transition-colors duration-200"
        style={{ color: styles.textColor }}
      >
        {text}
      </span>
    </button>
  );
}
