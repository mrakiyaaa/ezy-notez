"use client";

import { useState, useEffect } from "react";
import { X, Check, FileText, Sparkles, Loader2 } from "lucide-react";
import type { Resource } from "@/types/resource";
import { getWorkspaceResources } from "@/services/resource.service";

interface FlashcardGenerationPanelProps {
  workspaceId: string;
  isGenerating: boolean;
  onGenerate: (resourceIds: string[], topic: string, cardCount: number) => void;
  onClose: () => void;
}

export default function FlashcardGenerationPanel({
  workspaceId,
  isGenerating,
  onGenerate,
  onClose,
}: FlashcardGenerationPanelProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState(10);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingResources(true);
    getWorkspaceResources(workspaceId)
      .then((res) => {
        if (mounted) {
          // Only resources with extracted text can produce flashcards
          setResources(res.filter((r) => r.status === "ready" && r.extracted_text));
          setIsLoadingResources(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoadingResources(false);
      });
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isDisabled = isGenerating || selectedIds.size === 0;

  const sliderPct = ((cardCount - 5) / 15) * 100;

  return (
    <div
      className="rounded-xl border bg-bg-card p-5 flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "var(--color-blue-accent)" }} />
          </div>
          <div>
            <h3 className="text-text-primary text-sm font-semibold">
              Generate Flashcards
            </h3>
            <p className="text-text-muted text-xs">
              Select resources and optionally set a topic focus
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Resource selection */}
        <div>
          <label className="text-text-secondary text-xs font-medium mb-2 block">
            Select Resources
          </label>

          {isLoadingResources ? (
            <div className="flex items-center justify-center py-6 rounded-xl border border-fade-border">
              <Loader2
                className="w-5 h-5 animate-spin"
                style={{ color: "var(--color-text-muted)" }}
              />
            </div>
          ) : resources.length === 0 ? (
            <div className="rounded-xl border border-fade-border px-4 py-5 text-center">
              <p className="text-text-muted text-xs">No ready resources found.</p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Upload and process resources first.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-fade-border overflow-hidden max-h-44 overflow-y-auto">
              {resources.map((r) => {
                const isSelected = selectedIds.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleSelect(r.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-fade-border last:border-b-0"
                  >
                    {/* Checkbox */}
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-150"
                      style={{
                        borderColor: isSelected
                          ? "var(--color-blue-accent)"
                          : "var(--color-fade-border)",
                        backgroundColor: isSelected ? "var(--color-blue-accent)" : "transparent",
                      }}
                    >
                      {isSelected && (
                        <Check
                          className="w-2.5 h-2.5"
                          style={{ color: "#ffffff" }}
                        />
                      )}
                    </div>
                    <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="text-text-primary text-xs truncate text-left">
                      {r.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedIds.size > 0 && (
            <p className="text-text-muted text-[11px] mt-1.5">
              {selectedIds.size} resource{selectedIds.size > 1 ? "s" : ""}{" "}
              selected
            </p>
          )}
        </div>

        {/* Topic + card count + action */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-text-secondary text-xs font-medium mb-2 block">
              Topic Focus{" "}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Neural networks, sorting algorithms…"
              className="w-full bg-bg-card border border-fade-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Card count slider */}
          <div>
            <label className="text-text-secondary text-xs font-medium mb-2 block">
              Number of Cards{" "}
              <span className="font-semibold text-text-primary">
                {cardCount}
              </span>
            </label>
            <input
              type="range"
              min={5}
              max={20}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-blue-accent) 0%, var(--color-blue-accent) ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          <button
            onClick={() => onGenerate(Array.from(selectedIds), topic, cardCount)}
            disabled={isDisabled}
            className="mt-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-blue-accent)", color: "#ffffff" }}
            onMouseEnter={(e) => {
              if (!isDisabled) e.currentTarget.style.opacity = "0.88";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
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
                Generate Flashcards
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
