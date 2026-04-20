"use client";

import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import type { QuestionType } from "@/types/quiz";
import {
  QUESTION_COUNT_OPTIONS,
  type QuestionCountOption,
} from "./constants";
import ResourceChipSelector from "./ResourceChipSelector";
import QuestionTypeToggle from "./QuestionTypeToggle";

interface QuizConfigFormProps {
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
    <div className="bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 bg-blue-accent/10 border border-blue-accent/30 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-accent" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-text-primary font-semibold font-display text-sm">Generate Quiz</p>
            <p className="text-text-muted text-xs font-light">Create AI-powered questions from your resources</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 border-white/[0.08] rounded-md flex items-center justify-center text-text-muted hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 self-start transition-all duration-150"
          aria-label="Close panel"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Panel body */}
      <div className="grid grid-cols-2 border-t border-fade-border">
        {/* Left col — Select Resources */}
        <div className="p-5 border-r border-fade-border">
          <p className="text-text-primary font-semibold font-display text-sm mb-2">
            Select Resources
          </p>
          <ResourceChipSelector
            workspaceId={workspaceId}
            selectedIds={selectedResourceIds}
            onSelectionChange={setSelectedResourceIds}
          />
        </div>

        {/* Right col — Config */}
        <div className="p-5 flex flex-col gap-5">
          {/* Question Type */}
          <div>
            <p className="text-text-primary font-semibold font-display text-sm mb-3">
              Question Type
            </p>
            <QuestionTypeToggle
              selectedType={questionType}
              onTypeChange={setQuestionType}
            />
          </div>

          {/* Number of Questions */}
          <div>
            <p className="text-text-primary font-semibold font-display text-sm mb-3">
              Number of Questions
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUESTION_COUNT_OPTIONS.map((count) => {
                const isSelected = questionCount === count;
                return (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={[
                      "py-2.5 rounded-lg border text-center font-semibold font-display text-sm cursor-pointer transition-all duration-150",
                      isSelected
                        ? "bg-blue-accent/10 border-blue-accent/30 text-text-secondary"
                        : "bg-main border-fade-border text-text-muted hover:border-[#253040]",
                    ].join(" ")}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button + hint */}
          <div>
            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              className="w-full bg-blue-accent text-white font-semibold font-display text-sm rounded-lg py-3 flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
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
            <p className="text-text-muted text-[11px] text-center mt-2">
              Select at least one resource to generate a quiz
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
