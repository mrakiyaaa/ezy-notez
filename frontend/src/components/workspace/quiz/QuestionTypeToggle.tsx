"use client";

import type { QuestionType } from "@/types/quiz";
import { QUESTION_TYPE_OPTIONS } from "./constants";

interface QuestionTypeToggleProps {
  selectedType: QuestionType;
  onTypeChange: (type: QuestionType) => void;
}

export default function QuestionTypeToggle({
  selectedType,
  onTypeChange,
}: QuestionTypeToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex rounded-lg border border-fade-border bg-white/[0.02] p-1">
        {QUESTION_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onTypeChange(option.id)}
              className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isSelected
                  ? "rgba(255, 255, 255, 0.08)"
                  : "transparent",
                color: isSelected ? "var(--color-blue-accent)" : "var(--color-text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.color = "var(--color-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                }
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {/* Description of selected type */}
      <p className="text-text-muted text-xs text-center">
        {QUESTION_TYPE_OPTIONS.find((opt) => opt.id === selectedType)?.description}
      </p>
    </div>
  );
}
