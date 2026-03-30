import {
  AlignLeft,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileText,
  Info,
  ListChecks,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Resource, ResourceType } from "@/types/resource";
import type { Summary } from "@/types/summary";
import {
  FORMAT_OPTIONS,
  RESOURCE_TYPE_ICONS,
  getFormatLabel,
  formatSummaryDate,
  getWordCount,
  type AuraProps,
} from "./constants";
import SummaryContent from "./SummaryContent";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResultsPhaseProps extends AuraProps {
  activeSummary: Summary;
  activeBatch: Summary[];
  activeTabId: string;
  error: string | null;
  regeneratingId: string | null;
  sourcesExpanded: boolean;
  resources: Resource[];
  onBack: () => void;
  onNewSummary: () => void;
  onDelete: () => void;
  onRegenerate: (summaryId: string) => void;
  onTabChange: (id: string) => void;
  onToggleSources: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResultsPhase({
  auraHex,
  auraRgb,
  auraContrast,
  activeSummary,
  activeBatch,
  activeTabId,
  error,
  regeneratingId,
  sourcesExpanded,
  resources,
  onBack,
  onNewSummary,
  onDelete,
  onRegenerate,
  onTabChange,
  onToggleSources,
}: ResultsPhaseProps) {
  const findResourceName = (resourceId: string): string =>
    resources.find((resource) => resource.id === resourceId)?.name ??
    "Unknown resource";

  const findResourceType = (resourceId: string): ResourceType =>
    resources.find((resource) => resource.id === resourceId)?.type ?? "pdf";

  const isGeneralMode = activeBatch.some(
    (summary) => summary.resource_id === null
  );

  const resultTitle = isGeneralMode
    ? "General Summary"
    : activeSummary.resource_id
      ? findResourceName(activeSummary.resource_id)
      : "Resource Summaries";

  const sourceResourceIds = isGeneralMode
    ? activeSummary.source_ids ?? []
    : ([
        ...new Set(
          activeBatch
            .map((summary) => summary.resource_id)
            .filter(Boolean)
        ),
      ] as string[]);

  const wordCount = getWordCount(activeSummary.content);
  const formatLabel = getFormatLabel(activeSummary.format);
  const generatedDate = formatSummaryDate(activeSummary.updated_at);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ---- Top bar ---- */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-all duration-200 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">
            Back to Summarization
          </span>
        </button>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
          >
            <ListChecks
              className="w-3.5 h-3.5"
              style={{ color: auraHex }}
            />
          </div>
          <h2 className="text-text-primary text-lg font-semibold truncate">
            {resultTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={onNewSummary}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-text-secondary transition-all duration-200"
          >
            New Summary
          </Button>
          <Button
            onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-900/20 hover:bg-red-900/30 text-red-400 transition-all duration-200"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* ---- Two-column layout ---- */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN — Summary content (~65%) */}
        <div className="flex-1 lg:basis-[65%] min-w-0">
          <div
            className="rounded-xl border border-fade-border bg-bg-card p-5 transition-all duration-200"
            style={{
              boxShadow: `0 0 20px rgba(${auraRgb}, 0.06)`,
              borderColor: `rgba(${auraRgb}, 0.15)`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `rgba(${auraRgb}, 0.15)`,
                    color: auraHex,
                  }}
                >
                  {formatLabel}
                </span>
                {activeSummary.status === "ready" && (
                  <span className="text-text-muted text-xs">
                    {generatedDate}
                  </span>
                )}
              </div>
              <button
                onClick={() => onRegenerate(activeSummary.id)}
                disabled={regeneratingId === activeSummary.id}
                className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-all duration-200 disabled:opacity-50"
                style={{ color: auraHex }}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    regeneratingId === activeSummary.id
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Re-summarize
              </button>
            </div>

            <SummaryContent summary={activeSummary} auraHex={auraHex} />
          </div>
        </div>

        {/* RIGHT COLUMN — Sources & Info (~35%) */}
        <div className="lg:basis-[35%] flex flex-col gap-4">
          {/* Sources Used card */}
          <div
            className="rounded-xl border border-fade-border bg-bg-card p-4 transition-all duration-200"
            style={{ boxShadow: `0 0 12px rgba(${auraRgb}, 0.04)` }}
          >
            <button
              onClick={onToggleSources}
              className="w-full flex items-center justify-between text-text-secondary text-sm font-medium hover:text-text-primary transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Sources Used ({sourceResourceIds.length})</span>
              </div>
              {sourcesExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {sourcesExpanded && sourceResourceIds.length > 0 && (
              <div className="mt-3 flex flex-col">
                {sourceResourceIds.map((resourceId, index) => {
                  const Icon =
                    RESOURCE_TYPE_ICONS[findResourceType(resourceId)] ??
                    FileText;
                  return (
                    <div
                      key={resourceId}
                      className={`flex items-center gap-2.5 py-2.5 text-text-muted text-sm ${
                        index < sourceResourceIds.length - 1
                          ? "border-b border-fade-border"
                          : ""
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {findResourceName(resourceId)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Info card */}
          <div
            className="rounded-xl border border-fade-border bg-bg-card p-4 transition-all duration-200"
            style={{ boxShadow: `0 0 12px rgba(${auraRgb}, 0.04)` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary text-sm font-medium">
                Summary Info
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { label: "Format", value: formatLabel },
                { label: "Generated", value: generatedDate },
                {
                  label: "Word Count",
                  value: wordCount.toLocaleString(),
                },
                {
                  label: "Sources",
                  value: String(sourceResourceIds.length),
                },
              ].map(({ label, value }, index, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted text-xs">{label}</span>
                    <span className="text-text-primary text-xs font-medium">
                      {value}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className="border-b border-fade-border mt-2.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Bottom tabs (Customize mode only) ---- */}
      {!isGeneralMode && activeBatch.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {activeBatch.map((summary) => {
            const tabName = summary.resource_id
              ? findResourceName(summary.resource_id)
              : "General";
            const TabIcon = summary.resource_id
              ? (RESOURCE_TYPE_ICONS[
                  findResourceType(summary.resource_id)
                ] ?? FileText)
              : AlignLeft;
            const isActive = summary.id === activeTabId;

            return (
              <button
                key={summary.id}
                onClick={() => onTabChange(summary.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium flex items-center gap-1.5 shrink-0 transition-all duration-200 ${
                  isActive
                    ? ""
                    : "text-text-muted hover:text-text-primary"
                }`}
                style={
                  isActive
                    ? { backgroundColor: auraHex, color: auraContrast }
                    : undefined
                }
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span className="max-w-35 truncate">{tabName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
