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
    <div className="flex border border-fade-border rounded-lg overflow-hidden">
      {QUESTION_TYPE_OPTIONS.map((option, index) => {
        const isSelected = selectedType === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onTypeChange(option.id)}
            className={[
              "flex-1 py-3 text-center cursor-pointer transition-all duration-150",
              isSelected
                ? "bg-blue-accent/10 text-text-secondary"
                : "bg-main text-text-muted font-semibold font-display text-sm hover:opacity-90",
              index < QUESTION_TYPE_OPTIONS.length - 1 ? "border-r border-fade-border" : ""
            ].join(" ")}
          >
            <span
              className={[
                "block font-semibold font-display text-sm",
              ].join(" ")}
            >
              {option.label}
            </span>
            {isSelected && (
              <span className="block text-[10px] text-text-muted mt-0.5">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
