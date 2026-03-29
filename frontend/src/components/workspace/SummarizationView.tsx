"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  FileText,
  Presentation,
  Image as ImageIcon,
  Info,
  Music,
  Video,
  Loader2,
  RefreshCw,
  Trash2,
  Sparkles,
  Check,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkspaceResources } from "@/services/resource.service";
import {
  generateGeneralSummary,
  generateCustomSummaries,
  getWorkspaceSummaries,
  regenerateSummary as regenerateSummaryApi,
  deleteSummary as deleteSummaryApi,
} from "@/services/summary.service";
import type { Resource, ResourceType } from "@/types/resource";
import type { Summary, SummaryFormat } from "@/types/summary";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Mode = "general" | "customize";
type Phase = "configure" | "processing" | "results";

const FORMAT_OPTIONS: { id: SummaryFormat; label: string }[] = [
  { id: "bullet", label: "Bullet Points" },
  { id: "short", label: "Short Paragraph" },
  { id: "detailed", label: "Detailed" },
];

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  pdf: FileText,
  ppt: Presentation,
  image: ImageIcon,
  audio: Music,
  youtube: Video,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group summaries into batches by creation-time proximity (60 s threshold) */
function groupIntoBatches(summaries: Summary[]): Summary[][] {
  if (summaries.length === 0) return [];

  const sorted = [...summaries].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const batches: Summary[][] = [];
  let current: Summary[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.abs(
      new Date(current[0].created_at).getTime() -
        new Date(sorted[i].created_at).getTime()
    );
    if (gap < 60_000) {
      current.push(sorted[i]);
    } else {
      batches.push(current);
      current = [sorted[i]];
    }
  }
  batches.push(current);
  return batches;
}

/** Plain-text preview from summary content (max 80 chars) */
function getPreview(batch: Summary[]): string {
  const s = batch.find((x) => x.content && x.status === "ready");
  if (!s?.content) return "Summary pending\u2026";
  return (
    s.content
      .replace(/^-\s+/gm, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 80) + (s.content.length > 80 ? "\u2026" : "")
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummarizationViewProps {
  workspaceId: string;
  auraHex: string;
  auraRgb: string;
  auraContrast: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SummarizationView({
  workspaceId,
  auraHex,
  auraRgb,
  auraContrast,
}: SummarizationViewProps) {
  // --- Phase state ---
  const [phase, setPhase] = useState<Phase>("configure");

  // --- Configuration state ---
  const [mode, setMode] = useState<Mode>("general");
  const [format, setFormat] = useState<SummaryFormat>("bullet");
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Results state ---
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ready resources only
  const readyResources = resources.filter(
    (r) => r.status === "ready" && r.extracted_text
  );

  // Derived: batches & active batch
  const batches = useMemo(() => groupIntoBatches(summaries), [summaries]);

  const activeBatch = useMemo(
    () => batches.find((b) => b.some((s) => s.id === activeTabId)) ?? [],
    [batches, activeTabId]
  );

  const activeSummary = summaries.find((s) => s.id === activeTabId) ?? null;

  // ---------------------------------------------------------------------------
  // Load workspace resources
  // ---------------------------------------------------------------------------

  const loadResources = useCallback(async () => {
    try {
      setIsLoadingResources(true);
      const data = await getWorkspaceResources(workspaceId);
      setResources(data);
    } catch {
      setError("Failed to load resources");
    } finally {
      setIsLoadingResources(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // ---------------------------------------------------------------------------
  // Check for existing summaries on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    getWorkspaceSummaries(workspaceId).then((data) => {
      if (!mounted) return;
      if (data.length > 0) {
        setSummaries(data);

        const hasPending = data.some(
          (s) => s.status === "pending" || s.status === "processing"
        );
        if (hasPending) {
          setPhase("processing");
          setActiveTabId(data[0]?.id ?? null);
          startPolling();
        }
        // Otherwise stay on configure — summaries render as history cards
      }
    });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const data = await getWorkspaceSummaries(workspaceId);
        setSummaries(data);

        const allDone = data.every(
          (s) => s.status === "ready" || s.status === "failed"
        );
        if (allDone) {
          stopPolling();
          setPhase("results");
          if (!data.find((s) => s.id === activeTabId)) {
            setActiveTabId(data[0]?.id ?? null);
          }
        }
      } catch {
        // keep polling on transient errors
      }
    }, 3000);
  }, [workspaceId, stopPolling, activeTabId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedIds(new Set(readyResources.map((r) => r.id)));

  const deselectAll = () => setSelectedIds(new Set());

  // ---------------------------------------------------------------------------
  // Generate
  // ---------------------------------------------------------------------------

  const handleGenerate = async () => {
    setError(null);

    if (mode === "customize" && selectedIds.size === 0) {
      setError("Please select at least one resource");
      return;
    }

    if (mode === "general" && readyResources.length === 0) {
      setError("No resources with extracted text available");
      return;
    }

    try {
      setPhase("processing");

      let data: Summary[];
      if (mode === "general") {
        const summary = await generateGeneralSummary(workspaceId, format);
        data = [summary];
      } else {
        data = await generateCustomSummaries(
          workspaceId,
          format,
          Array.from(selectedIds)
        );
      }

      setSummaries((prev) => [...data, ...prev]);
      setActiveTabId(data[0]?.id ?? null);
      startPolling();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
      setPhase("configure");
    }
  };

  // ---------------------------------------------------------------------------
  // Re-summarize
  // ---------------------------------------------------------------------------

  const handleRegenerate = async (summaryId: string) => {
    setRegeneratingId(summaryId);
    try {
      await regenerateSummaryApi(summaryId);
      startPolling();
      setPhase("processing");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate summary"
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete active batch
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    try {
      for (const s of activeBatch) {
        await deleteSummaryApi(s.id);
      }
      const deletedIds = new Set(activeBatch.map((s) => s.id));
      setSummaries((prev) => prev.filter((s) => !deletedIds.has(s.id)));
      setActiveTabId(null);
      setPhase("configure");
    } catch {
      setError("Failed to delete summaries");
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleNewSummary = () => {
    setPhase("configure");
    setActiveTabId(null);
    setSelectedIds(new Set());
    setError(null);
  };

  const handleBackToHome = () => {
    setPhase("configure");
    setError(null);
  };

  const handleViewBatch = (batch: Summary[]) => {
    setActiveTabId(batch[0].id);
    const isGeneral = batch.some((s) => s.resource_id === null);
    setMode(isGeneral ? "general" : "customize");
    setPhase("results");
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getResourceName = (id: string) =>
    resources.find((r) => r.id === id)?.name ?? "Unknown resource";

  const getResourceType = (id: string): ResourceType =>
    resources.find((r) => r.id === id)?.type ?? "pdf";

  // ---------------------------------------------------------------------------
  // Render: Configure phase
  // ---------------------------------------------------------------------------

  const renderConfigure = () => {
    const completedBatches = batches.filter((b) =>
      b.every((s) => s.status === "ready" || s.status === "failed")
    );

    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
          >
            <AlignLeft className="w-5 h-5" style={{ color: auraHex }} />
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

        {/* Mode selector */}
        <div>
          <label className="text-text-secondary text-sm font-medium mb-2 block">
            Mode
          </label>
          <div className="flex items-center gap-1">
            {(
              [
                { id: "general", label: "General Summary" },
                { id: "customize", label: "Customize" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => {
                  setMode(id);
                  setError(null);
                }}
                className={
                  mode === id
                    ? "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
                    : "text-text-muted px-4 py-1.5 text-sm font-medium hover:text-text-primary transition-all duration-200"
                }
                style={
                  mode === id
                    ? { backgroundColor: auraHex, color: auraContrast }
                    : undefined
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-text-muted text-xs mt-2">
            {mode === "general"
              ? "Summarizes all resources in this workspace into one combined summary."
              : "Select specific resources — each gets its own separate summary."}
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
                  onClick={selectAll}
                  className="text-xs hover:underline transition-all duration-200"
                  style={{ color: auraHex }}
                >
                  Select All
                </button>
                <span className="text-text-muted text-xs">|</span>
                <button
                  onClick={deselectAll}
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
                  style={{ color: auraHex }}
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
                  const Icon = TYPE_ICONS[resource.type] ?? FileText;
                  const isSelected = selectedIds.has(resource.id);
                  return (
                    <button
                      key={resource.id}
                      onClick={() => toggleSelection(resource.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all duration-200 border-b border-fade-border last:border-b-0"
                    >
                      <div
                        className="w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all duration-200"
                        style={{
                          borderColor: isSelected
                            ? auraHex
                            : "rgba(255,255,255,0.15)",
                          backgroundColor: isSelected
                            ? auraHex
                            : "transparent",
                        }}
                      >
                        {isSelected && (
                          <Check
                            className="w-3 h-3"
                            style={{ color: auraContrast }}
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
                {selectedIds.size} resource{selectedIds.size > 1 ? "s" : ""}{" "}
                selected
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
                onClick={() => setFormat(id)}
                className={
                  format === id
                    ? "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
                    : "text-text-muted px-4 py-1.5 text-sm font-medium hover:text-text-primary transition-all duration-200"
                }
                style={
                  format === id
                    ? { backgroundColor: auraHex, color: auraContrast }
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
          onClick={handleGenerate}
          disabled={
            (mode === "customize" && selectedIds.size === 0) ||
            (mode === "general" && readyResources.length === 0)
          }
          className="rounded-lg px-6 py-2.5 text-sm font-medium flex items-center gap-2 disabled:opacity-50 w-fit"
          style={{ backgroundColor: auraHex, color: auraContrast }}
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

        {/* ----------------------------------------------------------------- */}
        {/* History section                                                     */}
        {/* ----------------------------------------------------------------- */}

        <div className="mt-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedBatches.map((batch) => {
                const isGeneral = batch.some((s) => s.resource_id === null);
                const batchFormat =
                  FORMAT_OPTIONS.find((f) => f.id === batch[0].format)?.label ??
                  batch[0].format;
                const date = new Date(
                  batch[0].created_at
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const preview = getPreview(batch);

                return (
                  <button
                    key={batch[0].id}
                    onClick={() => handleViewBatch(batch)}
                    className="group text-left rounded-xl border border-fade-border bg-bg-card p-4 transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      borderLeftWidth: "3px",
                      borderLeftColor: auraHex,
                      boxShadow: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 4px 20px rgba(${auraRgb}, 0.1)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: `rgba(${auraRgb}, 0.15)`,
                          color: auraHex,
                        }}
                      >
                        {isGeneral ? "General" : "Customize"}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-text-muted bg-white/5">
                        {batchFormat}
                      </span>
                    </div>

                    {/* Preview text */}
                    <p className="text-text-secondary text-sm leading-relaxed line-clamp-2 mb-2">
                      {preview}
                    </p>

                    {/* Date */}
                    <span className="text-text-muted text-xs">{date}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Processing phase (unchanged)
  // ---------------------------------------------------------------------------

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
        >
          <Sparkles className="w-8 h-8" style={{ color: auraHex }} />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-text-primary text-lg font-semibold mb-1">
          Summarizing your resources...
        </h3>
        <p className="text-text-muted text-sm">
          This may take a moment depending on the size of your content.
        </p>
      </div>
      {/* Progress bar */}
      <div className="w-64 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full animate-pulse"
          style={{
            backgroundColor: auraHex,
            width: "60%",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      </div>
      {summaries.length > 0 && (
        <div className="flex items-center gap-2 text-text-muted text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          {summaries.filter((s) => s.status === "ready").length} /{" "}
          {summaries.length} complete
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Summary content (shared helper)
  // ---------------------------------------------------------------------------

  const renderSummaryContent = (summary: Summary) => {
    if (summary.status === "failed") {
      return (
        <div className="rounded-xl border border-red-900/40 bg-red-900/10 p-4">
          <p className="text-red-400 text-sm font-medium mb-1">
            Summarization failed
          </p>
          <p className="text-red-400/80 text-xs">
            {summary.error_message ?? "An unknown error occurred."}
          </p>
        </div>
      );
    }

    if (!summary.content) {
      return (
        <p className="text-text-muted text-sm italic">No content available.</p>
      );
    }

    const lines = summary.content.split("\n");
    return (
      <div className="flex flex-col gap-2">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-2" />;

          if (trimmed.startsWith("- ")) {
            return (
              <div key={i} className="flex gap-2.5 items-start">
                <span
                  className="mt-1.75 w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: auraHex }}
                />
                <p className="text-text-primary text-sm leading-relaxed">
                  {trimmed.slice(2)}
                </p>
              </div>
            );
          }

          return (
            <p key={i} className="text-text-primary text-sm leading-relaxed">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Results phase (redesigned two-column layout)
  // ---------------------------------------------------------------------------

  const renderResults = () => {
    if (summaries.length === 0 || !activeSummary) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
          <AlignLeft className="w-12 h-12" />
          <p className="text-sm">No summaries yet.</p>
        </div>
      );
    }

    const isGeneralMode = activeBatch.some((s) => s.resource_id === null);

    const resultTitle = isGeneralMode
      ? "General Summary"
      : activeSummary.resource_id
        ? getResourceName(activeSummary.resource_id)
        : "Resource Summaries";

    const sourceIds = isGeneralMode
      ? activeSummary.source_ids ?? []
      : ([
          ...new Set(
            activeBatch.map((s) => s.resource_id).filter(Boolean)
          ),
        ] as string[]);

    const wordCount = activeSummary.content
      ? activeSummary.content.split(/\s+/).filter(Boolean).length
      : 0;

    const formatLabel =
      FORMAT_OPTIONS.find((f) => f.id === activeSummary.format)?.label ??
      activeSummary.format;

    const generatedDate = new Date(
      activeSummary.updated_at
    ).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="flex flex-col gap-6 p-6">
        {/* ---- Top bar ---- */}
        <div className="flex items-center gap-4">
          {/* Back */}
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-all duration-200 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">
              Back to Summarization
            </span>
          </button>

          {/* Title */}
          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
            >
              <ListChecks className="w-3.5 h-3.5" style={{ color: auraHex }} />
            </div>
            <h2 className="text-text-primary text-lg font-semibold truncate">
              {resultTitle}
            </h2>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleNewSummary}
              className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-text-secondary transition-all duration-200"
            >
              New Summary
            </Button>
            <Button
              onClick={handleDelete}
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
              {/* Header row */}
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
                  onClick={() => handleRegenerate(activeSummary.id)}
                  disabled={regeneratingId === activeSummary.id}
                  className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-all duration-200 disabled:opacity-50"
                  style={{ color: auraHex }}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      regeneratingId === activeSummary.id ? "animate-spin" : ""
                    }`}
                  />
                  Re-summarize
                </button>
              </div>

              {/* Content */}
              {renderSummaryContent(activeSummary)}
            </div>
          </div>

          {/* RIGHT COLUMN — Sources & Info (~35%) */}
          <div className="lg:basis-[35%] flex flex-col gap-4">
            {/* Sources Used card */}
            <div
              className="rounded-xl border border-fade-border bg-bg-card p-4 transition-all duration-200"
              style={{
                boxShadow: `0 0 12px rgba(${auraRgb}, 0.04)`,
              }}
            >
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="w-full flex items-center justify-between text-text-secondary text-sm font-medium hover:text-text-primary transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Sources Used ({sourceIds.length})</span>
                </div>
                {sourcesExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {sourcesExpanded && sourceIds.length > 0 && (
                <div className="mt-3 flex flex-col">
                  {sourceIds.map((sid, idx) => {
                    const Icon = TYPE_ICONS[getResourceType(sid)] ?? FileText;
                    return (
                      <div
                        key={sid}
                        className={`flex items-center gap-2.5 py-2.5 text-text-muted text-sm ${
                          idx < sourceIds.length - 1
                            ? "border-b border-fade-border"
                            : ""
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {getResourceName(sid)}
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
              style={{
                boxShadow: `0 0 12px rgba(${auraRgb}, 0.04)`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary text-sm font-medium">
                  Summary Info
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Format</span>
                  <span className="text-text-primary text-xs font-medium">
                    {formatLabel}
                  </span>
                </div>
                <div className="border-b border-fade-border" />

                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Generated</span>
                  <span className="text-text-primary text-xs font-medium">
                    {generatedDate}
                  </span>
                </div>
                <div className="border-b border-fade-border" />

                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Word Count</span>
                  <span className="text-text-primary text-xs font-medium">
                    {wordCount.toLocaleString()}
                  </span>
                </div>
                <div className="border-b border-fade-border" />

                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Sources</span>
                  <span className="text-text-primary text-xs font-medium">
                    {sourceIds.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Bottom tabs (Customize mode only) ---- */}
        {!isGeneralMode && activeBatch.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            {activeBatch.map((s) => {
              const name = s.resource_id
                ? getResourceName(s.resource_id)
                : "General";
              const Icon = s.resource_id
                ? (TYPE_ICONS[getResourceType(s.resource_id)] ?? FileText)
                : AlignLeft;
              const isActive = s.id === activeTabId;

              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTabId(s.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium flex items-center gap-1.5 shrink-0 transition-all duration-200 ${
                    isActive ? "" : "text-text-muted hover:text-text-primary"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: auraHex, color: auraContrast }
                      : undefined
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="max-w-35 truncate">{name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="h-full overflow-y-auto">
      {phase === "configure" && renderConfigure()}
      {phase === "processing" && renderProcessing()}
      {phase === "results" && renderResults()}
    </div>
  );
}
