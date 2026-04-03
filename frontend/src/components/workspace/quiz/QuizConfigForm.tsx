"use client";

import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import type { QuestionType } from "@/types/quiz";
import type { AuraProps } from "./constants";
import {
  QUESTION_COUNT_OPTIONS,
  type QuestionCountOption,
} from "./constants";
import ResourceChipSelector from "./ResourceChipSelector";
import QuestionTypeToggle from "./QuestionTypeToggle";

interface QuizConfigFormProps extends AuraProps {
  workspaceId: string;
  isGenerating: boolean;
  onGenerate: (
    resourceIds: string[],
    questionType: QuestionType,
    questionCount: number
  ) => void;
  onClose: () => void;
}

export default function QuizConfigForm({
  workspaceId,
  isGenerating,
  onGenerate,
  onClose,
  auraHex,
  auraRgb,
  auraContrast,
}: QuizConfigFormProps) {
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(
    new Set()
  );
  const [questionType, setQuestionType] = useState<QuestionType>("mixed");
  const [questionCount, setQuestionCount] = useState<QuestionCountOption>(10);

  const isDisabled = isGenerating || selectedResourceIds.size === 0;

  const handleSubmit = () => {
    if (isDisabled) return;
    onGenerate(Array.from(selectedResourceIds), questionType, questionCount);
  };

  return (
    <div
      className="rounded-xl border bg-bg-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        borderColor: `rgba(${auraRgb}, 0.22)`,
        boxShadow: `0 0 32px rgba(${auraRgb}, 0.08)`,
      }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: auraHex }} />
          </div>
          <div>
            <h3 className="text-text-primary text-base font-semibold">
              Generate Quiz
            </h3>
            <p className="text-text-muted text-sm">
              Create AI-powered questions from your resources
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Resource selection */}
        <div className="flex flex-col gap-3">
          <label className="text-text-secondary text-sm font-medium">
            Select Resources
          </label>
          <ResourceChipSelector
            workspaceId={workspaceId}
            selectedIds={selectedResourceIds}
            onSelectionChange={setSelectedResourceIds}
            auraHex={auraHex}
            auraRgb={auraRgb}
            auraContrast={auraContrast}
          />
        </div>

        {/* Right column: Question type and count */}
        <div className="flex flex-col gap-5">
          {/* Question type */}
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">
              Question Type
            </label>
            <QuestionTypeToggle
              selectedType={questionType}
              onTypeChange={setQuestionType}
              auraHex={auraHex}
              auraRgb={auraRgb}
              auraContrast={auraContrast}
            />
          </div>

          {/* Question count */}
          <div className="flex flex-col gap-3">
            <label className="text-text-secondary text-sm font-medium">
              Number of Questions
            </label>
            <div className="flex gap-2">
              {QUESTION_COUNT_OPTIONS.map((count) => {
                const isSelected = questionCount === count;
                return (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200"
                    style={{
                      backgroundColor: isSelected
                        ? `rgba(${auraRgb}, 0.15)`
                        : "rgba(255, 255, 255, 0.02)",
                      borderColor: isSelected
                        ? auraHex
                        : "var(--color-fade-border)",
                      color: isSelected ? auraHex : "var(--color-text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.4)`;
                        e.currentTarget.style.color = "var(--color-text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "var(--color-fade-border)";
                        e.currentTarget.style.color = "var(--color-text-secondary)";
                      }
                    }}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            className="mt-auto flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: auraHex,
              color: auraContrast,
              boxShadow: isDisabled
                ? "none"
                : `0 0 24px rgba(${auraRgb}, 0.3)`,
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.boxShadow = `0 0 36px rgba(${auraRgb}, 0.45)`;
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.boxShadow = `0 0 24px rgba(${auraRgb}, 0.3)`;
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Quiz
              </>
            )}
          </button>

          {/* Help text */}
          {selectedResourceIds.size === 0 && (
            <p className="text-text-muted text-xs text-center">
              Select at least one resource to generate a quiz
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
