import {
  Zap,
  Check,
  Loader2,
  FileText
} from "lucide-react";
import type { Resource } from "@/types/resource";
import type { Summary, SummaryFormat } from "@/types/summary";
import {
  FORMAT_OPTIONS,
  RESOURCE_TYPE_ICONS,
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

const TYPE_STYLES: Record<string, string> = {
  pdf: "bg-red-500/10 text-red-400",
  ppt: "bg-orange-500/10 text-orange-400",
  audio: "bg-purple-500/10 text-purple-400",
  youtube: "bg-red-500/10 text-red-400",
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
  isGenerateDisabled,
  onModeChange,
  onFormatChange,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onGenerate,
  onClearError,
}: ConfigurePhaseProps) {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-xl bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6 text-blue-accent" />
        </div>
        <div>
          <h1 className="text-text-primary font-semibold text-xl">
            AI Summarization
          </h1>
          <p className="text-text-muted text-sm">
            Generate smart summaries from your workspace resources
          </p>
        </div>
      </div>

      {/* Card 1 - Mode */}
      <div className="bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl p-5">
        <label className="text-text-muted text-xs font-bold uppercase tracking-wide block mb-3">
          Mode
        </label>
        <div className="bg-main border-white/[0.08] rounded-lg p-1 w-fit flex items-center">
          {MODE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                onModeChange(id);
                onClearError();
              }}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === id
                  ? "bg-blue-accent/10 border border-blue-accent/30 text-text-secondary rounded-md"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-text-muted text-xs mt-3">
          {MODE_DESCRIPTIONS[mode]}
        </p>
      </div>

      {/* Card 2 - Select Resources (customize only) */}
      {mode === "customize" && (
        <div className="bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <label className="text-text-muted text-xs font-bold uppercase tracking-wide">
              Select Resources
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={onSelectAll}
                className="text-blue-accent text-xs hover:underline"
              >
                Select All
              </button>
              <span className="text-text-muted text-xs">|</span>
              <button
                onClick={onDeselectAll}
                className="text-blue-accent text-xs hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>

          {isLoadingResources ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          ) : readyResources.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-text-muted text-sm">
                No resources with extracted text available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-75 overflow-y-auto pr-2">
              {readyResources.map((resource) => {
                const isSelected = selectedIds.has(resource.id);
                const Icon = RESOURCE_TYPE_ICONS[resource.type] ?? FileText;
                const typeStyle = TYPE_STYLES[resource.type] || "bg-white/10 text-white";

                return (
                  <button
                    key={resource.id}
                    onClick={() => onToggleSelection(resource.id)}
                    className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-accent/50 bg-blue-accent/6"
                        : "border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:border-fade-border/60 hover:bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.75 bg-blue-accent rounded-r" />
                    )}
                    
                    <div className={`w-8.5 h-8.5 rounded flex items-center justify-center shrink-0 ${typeStyle}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col text-left overflow-hidden min-w-0">
                      <span className="text-text-primary text-xs font-medium truncate">
                        {resource.name}
                      </span>
                      <span className="text-text-muted text-[11px] truncate mt-0.5">
                        {resource.type.toUpperCase()} • {Math.round((resource.size || 0) / 1024)} KB
                      </span>
                    </div>

                    <div
                      className={`w-4.5 h-4.5 rounded-md ml-auto shrink-0 flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-accent border-blue-accent"
                          : "border border-text-muted"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {selectedIds.size > 0 && (
            <p className="text-text-muted text-xs mt-3">
              {selectedIds.size} resource{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      )}

      {/* Card 3 - Summary Format + Generate */}
      <div className="bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl p-5">
        <label className="text-text-muted text-xs font-bold uppercase tracking-wide block mb-3">
          Summary Format
        </label>
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {FORMAT_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onFormatChange(id)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                format === id
                  ? "bg-blue-accent/10 border-blue-accent/30 text-text-secondary"
                  : "bg-main border-fade-border text-text-muted hover:text-text-primary hover:border-fade-border/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border-t border-fade-border pt-5 flex flex-col items-end gap-3">
          {error && <p className="text-red-400 text-xs text-right">{error}</p>}
          <button
            onClick={onGenerate}
            disabled={isGenerateDisabled}
            className="bg-blue-accent text-white font-semibold rounded-lg px-6 py-3 flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            Generate Summary
          </button>
        </div>
      </div>
    </div>
  );
}
