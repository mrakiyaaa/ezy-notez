import {
  AlignLeft,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Resource } from "@/types/resource";
import type { Summary, SummaryFormat } from "@/types/summary";
import {
  FORMAT_OPTIONS,
  RESOURCE_TYPE_ICONS,
  getBatchPreview,
  getFormatLabel,
  formatSummaryDate,
  type SummarizationMode,
} from "./constants";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfigurePhaseProps {
  mode: SummarizationMode;
  format: SummaryFormat;
  readyResources: Resource[];
  selectedIds: Set<string>;
  isLoadingResources: boolean;
  error: string | null;
  completedBatches: Summary[][];
  isGenerateDisabled: boolean;
  onModeChange: (mode: SummarizationMode) => void;
  onFormatChange: (format: SummaryFormat) => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onGenerate: () => void;
  onViewBatch: (batch: Summary[]) => void;
  onClearError: () => void;
}

// ---------------------------------------------------------------------------
// Mode options
// ---------------------------------------------------------------------------

const MODE_OPTIONS = [
  { id: "general" as const, label: "General Summary" },
  { id: "customize" as const, label: "Customize" },
];

const MODE_DESCRIPTIONS: Record<SummarizationMode, string> = {
  general:
    "Summarizes all resources in this workspace into one combined summary.",
  customize:
    "Select specific resources \u2014 each gets its own separate summary.",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfigurePhase({
  mode,
  format,
  readyResources,
  selectedIds,
  isLoadingResources,
  error,
  completedBatches,
  isGenerateDisabled,
  onModeChange,
  onFormatChange,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onGenerate,
  onViewBatch,
  onClearError,
}: ConfigurePhaseProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
        >
          <AlignLeft className="w-5 h-5" style={{ color: "var(--color-blue-accent)" }} />
        </div>
        <div>
          <h2 className="text-text-primary text-lg font-semibold">
            AI Summarization
          </h2>
          <p className="text-text-muted text-sm">
            Generate smart summaries from your resources
          </p>
        </div>
      </div>

      {/* Two-column layout: config left, history right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN — Configuration */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Mode selector */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-2 block">
              Mode
            </label>
            <div className="flex items-center gap-1">
              {MODE_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    onModeChange(id);
                    onClearError();
                  }}
                  className={
                    mode === id
                      ? "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
                      : "text-text-muted px-4 py-1.5 text-sm font-medium hover:text-text-primary transition-all duration-200"
                  }
                  style={
                    mode === id
                      ? { backgroundColor: "var(--color-blue-accent)", color: "#ffffff" }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-text-muted text-xs mt-2">
              {MODE_DESCRIPTIONS[mode]}
            </p>
          </div>

          {/* Resource picker (customize mode) */}
          {mode === "customize" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-text-secondary text-sm font-medium">
                  Select Resources
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onSelectAll}
                    className="text-xs text-text-muted hover:text-text-primary hover:underline transition-all duration-200"
                  >
                    Select All
                  </button>
                  <span className="text-text-muted text-xs">|</span>
                  <button
                    onClick={onDeselectAll}
                    className="text-xs text-text-muted hover:text-text-primary transition-all duration-200"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {isLoadingResources ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="w-6 h-6 animate-spin"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                </div>
              ) : readyResources.length === 0 ? (
                <div className="rounded-xl border border-fade-border bg-bg-card p-6 text-center">
                  <p className="text-text-muted text-sm">
                    No resources with extracted text available.
                  </p>
                  <p className="text-text-muted text-xs mt-1">
                    Upload and process resources first.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-fade-border bg-bg-card max-h-64 overflow-y-auto">
                  {readyResources.map((resource) => {
                    const Icon =
                      RESOURCE_TYPE_ICONS[resource.type] ?? FileText;
                    const isSelected = selectedIds.has(resource.id);
                    return (
                      <button
                        key={resource.id}
                        onClick={() => onToggleSelection(resource.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all duration-200 border-b border-fade-border last:border-b-0"
                      >
                        <div
                          className="w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all duration-200"
                          style={{
                            borderColor: isSelected
                              ? "var(--color-blue-accent)"
                              : "var(--color-fade-border)",
                            backgroundColor: isSelected
                              ? "var(--color-blue-accent)"
                              : "transparent",
                          }}
                        >
                          {isSelected && (
                            <Check
                              className="w-3 h-3"
                              style={{ color: "#ffffff" }}
                            />
                          )}
                        </div>
                        <Icon className="w-4 h-4 text-text-muted shrink-0" />
                        <span className="text-text-primary text-sm truncate text-left">
                          {resource.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedIds.size > 0 && (
                <p className="text-text-muted text-xs mt-1.5">
                  {selectedIds.size} resource
                  {selectedIds.size > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {/* Format picker */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-2 block">
              Summary Format
            </label>
            <div className="flex items-center gap-1">
              {FORMAT_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => onFormatChange(id)}
                  className={
                    format === id
                      ? "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
                      : "text-text-muted px-4 py-1.5 text-sm font-medium hover:text-text-primary transition-all duration-200"
                  }
                  style={
                    format === id
                      ? { backgroundColor: "var(--color-blue-accent)", color: "#ffffff" }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Generate button */}
          <Button
            onClick={onGenerate}
            disabled={isGenerateDisabled}
            className="rounded-lg px-6 py-2.5 text-sm font-medium flex items-center gap-2 disabled:opacity-50 w-fit"
            style={{ backgroundColor: "var(--color-blue-accent)", color: "#ffffff" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <Sparkles className="w-4 h-4" />
            Generate Summary
          </Button>
        </div>

        {/* RIGHT COLUMN — Previous Summaries */}
        <div className="flex-1 lg:max-w-[45%]">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-text-muted" />
            <h3 className="text-text-secondary text-sm font-medium">
              Previous Summaries
            </h3>
          </div>

          {completedBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <AlignLeft className="w-10 h-10 text-text-muted opacity-30" />
              <p className="text-text-muted text-sm">
                No summaries yet. Generate your first one.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {completedBatches.map((batch) => {
                const isGeneral = batch.some(
                  (summary) => summary.resource_id === null
                );
                const batchFormatLabel = getFormatLabel(batch[0].format);
                const createdDate = formatSummaryDate(batch[0].created_at);
                const preview = getBatchPreview(batch);

                return (
                  <button
                    key={batch[0].id}
                    onClick={() => onViewBatch(batch)}
                    className="group text-left rounded-xl border border-fade-border bg-bg-card p-4 transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      borderLeftWidth: "3px",
                      borderLeftColor: "var(--color-blue-accent)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: "rgba(80, 125, 188, 0.12)",
                          color: "var(--color-blue-accent)",
                        }}
                      >
                        {isGeneral ? "General" : "Customize"}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-text-muted bg-white/5">
                        {batchFormatLabel}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed line-clamp-2 mb-2">
                      {preview}
                    </p>
                    <span className="text-text-muted text-xs">
                      {createdDate}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
