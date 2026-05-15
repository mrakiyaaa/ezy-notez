"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft, Clock, Trash2 } from "lucide-react";
import { getWorkspaceResources } from "@/services/resource.service";
import {
  generateGeneralSummary,
  generateCustomSummaries,
  getWorkspaceSummaries,
  regenerateSummary as regenerateSummaryApi,
  deleteSummary as deleteSummaryApi,
} from "@/services/summary.service";
import type { Resource } from "@/types/resource";
import type { Summary, SummaryFormat } from "@/types/summary";
import {
  groupIntoBatches,
  getFormatLabel,
  formatSummaryDate,
  getBatchPreview,
  POLLING_INTERVAL_MS,
  type SummarizationMode,
  type SummarizationPhase,
} from "./summarization/constants";
import ConfigurePhase from "./summarization/ConfigurePhase";
import ProcessingPhase from "./summarization/ProcessingPhase";
import ResultsPhase from "./summarization/ResultsPhase";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummarizationViewProps {
  workspaceId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SummarizationView({
  workspaceId,
}: SummarizationViewProps) {
  // --- Phase state ---
  const [phase, setPhase] = useState<SummarizationPhase>("configure");

  // --- Configuration state ---
  const [mode, setMode] = useState<SummarizationMode>("general");
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
    (resource) => resource.status === "ready" && resource.extracted_text
  );

  // Derived: batches & active batch
  const batches = useMemo(() => groupIntoBatches(summaries), [summaries]);

  const activeBatch = useMemo(
    () =>
      batches.find((batch) => batch.some((summary) => summary.id === activeTabId)) ?? [],
    [batches, activeTabId]
  );

  const activeSummary = summaries.find(
    (summary) => summary.id === activeTabId
  ) ?? null;

  // ---------------------------------------------------------------------------
  // Load workspace resources
  // ---------------------------------------------------------------------------

  const loadResources = useCallback(async () => {
    try {
      setIsLoadingResources(true);
      const workspaceResources = await getWorkspaceResources(workspaceId);
      setResources(workspaceResources);
    } catch {
      setError("Failed to load workspace resources");
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

    getWorkspaceSummaries(workspaceId)
      .then((existingSummaries) => {
        if (!mounted) return;
        if (existingSummaries.length > 0) {
          setSummaries(existingSummaries);

          const hasPending = existingSummaries.some(
            (summary) =>
              summary.status === "pending" || summary.status === "processing"
          );
          if (hasPending) {
            setPhase("processing");
            setActiveTabId(existingSummaries[0]?.id ?? null);
            startPolling();
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Failed to load existing summaries");
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
        const latestSummaries = await getWorkspaceSummaries(workspaceId);
        setSummaries(latestSummaries);

        const allDone = latestSummaries.every(
          (summary) =>
            summary.status === "ready" || summary.status === "failed"
        );
        if (allDone) {
          stopPolling();
          setPhase("results");
          if (!latestSummaries.find((summary) => summary.id === activeTabId)) {
            setActiveTabId(latestSummaries[0]?.id ?? null);
          }
        }
      } catch {
        // keep polling on transient network errors
      }
    }, POLLING_INTERVAL_MS);
  }, [workspaceId, stopPolling, activeTabId]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const toggleSelection = (resourceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedIds(new Set(readyResources.map((resource) => resource.id)));

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

      let newSummaries: Summary[];
      if (mode === "general") {
        const summary = await generateGeneralSummary(workspaceId, format);
        newSummaries = [summary];
      } else {
        newSummaries = await generateCustomSummaries(
          workspaceId,
          format,
          Array.from(selectedIds)
        );
      }

      setSummaries((prev) => [...newSummaries, ...prev]);
      setActiveTabId(newSummaries[0]?.id ?? null);
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
      for (const summary of activeBatch) {
        await deleteSummaryApi(summary.id);
      }
      const deletedIds = new Set(activeBatch.map((summary) => summary.id));
      setSummaries((prev) =>
        prev.filter((summary) => !deletedIds.has(summary.id))
      );
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

  const handleDeleteBatch = async (
    e: React.MouseEvent,
    batch: Summary[]
  ) => {
    e.stopPropagation();
    try {
      await Promise.all(batch.map((s) => deleteSummaryApi(s.id)));
      const deletedIds = new Set(batch.map((s) => s.id));
      setSummaries((prev) => prev.filter((s) => !deletedIds.has(s.id)));
      // If the deleted batch was active, return to configure
      if (batch.some((s) => s.id === activeTabId)) {
        setActiveTabId(null);
        setPhase("configure");
      }
    } catch {
      setError("Failed to delete summary");
    }
  };

  const handleCancelProcessing = async () => {
    stopPolling();
    const pending = summaries.filter(
      (s) => s.status === "pending" || s.status === "processing"
    );
    try {
      await Promise.all(pending.map((s) => deleteSummaryApi(s.id)));
      setSummaries((prev) =>
        prev.filter((s) => s.status !== "pending" && s.status !== "processing")
      );
    } catch {
      // best-effort cleanup
    }
    setPhase("configure");
  };

  const handleBackToHome = () => {
    setPhase("configure");
    setError(null);
  };

  const handleViewBatch = (batch: Summary[]) => {
    setActiveTabId(batch[0].id);
    const isGeneral = batch.some((summary) => summary.resource_id === null);
    setMode(isGeneral ? "general" : "customize");
    setPhase("results");
  };

  // ---------------------------------------------------------------------------
  // Derived data for configure phase
  // ---------------------------------------------------------------------------

  const completedBatches = useMemo(
    () =>
      batches.filter((batch) =>
        batch.every(
          (summary) =>
            summary.status === "ready" || summary.status === "failed"
        )
      ),
    [batches]
  );

  const isGenerateDisabled =
    (mode === "customize" && selectedIds.size === 0) ||
    (mode === "general" && readyResources.length === 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const renderPhase = () => {
    if (phase === "processing") {
      return (
        <div className="h-full overflow-y-auto">
          <ProcessingPhase summaries={summaries} onCancel={handleCancelProcessing} />
        </div>
      );
    }

    if (phase === "results") {
      if (summaries.length === 0 || !activeSummary) {
        return (
          <div className="h-full overflow-y-auto">
            <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
              <AlignLeft className="w-12 h-12" />
              <p className="text-sm">No summaries yet.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full overflow-y-auto">
          <ResultsPhase
            activeSummary={activeSummary}
            activeBatch={activeBatch}
            activeTabId={activeTabId!}
            error={error}
            regeneratingId={regeneratingId}
            sourcesExpanded={sourcesExpanded}
            resources={resources}
            onBack={handleBackToHome}
            onNewSummary={handleNewSummary}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
            onTabChange={setActiveTabId}
            onToggleSources={() => setSourcesExpanded((prev) => !prev)}
          />
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto">
        <ConfigurePhase
          mode={mode}
          format={format}
          readyResources={readyResources}
          selectedIds={selectedIds}
          isLoadingResources={isLoadingResources}
          error={error}
          completedBatches={completedBatches}
          isGenerateDisabled={isGenerateDisabled}
          onModeChange={setMode}
          onFormatChange={setFormat}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onGenerate={handleGenerate}
          onViewBatch={handleViewBatch}
          onClearError={() => setError(null)}
        />
      </div>
    );
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Center - Main Content */}
      <div className="flex-1 bg-main overflow-y-auto">
        {renderPhase()}
      </div>

      {/* Right - Previous Summaries Panel (configure phase only) */}
      <div className={`w-96 shrink-0 bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] border-l border-fade-border flex-col h-full ${phase === "configure" ? "hidden lg:flex" : "hidden"}`}>
        <div className="p-4 border-b border-fade-border shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">PREVIOUS SUMMARIES</span>
          </div>
          <span className="bg-blue-accent/10 text-text-secondary text-[10px] font-semibold rounded-full px-2 py-0.5">
            {batches.length}
          </span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto scrollbar-hidden flex flex-col gap-3">
          {batches.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-10">No summaries yet.</div>
          ) : (
            batches.map((batch) => {
              const isGeneral = batch.some((s) => s.resource_id === null);
              const formatLabel = getFormatLabel(batch[0].format);
              const createdDate = formatSummaryDate(batch[0].created_at);
              const isPending = batch.some(
                (s) => s.status === "pending" || s.status === "processing"
              );
              const preview = getBatchPreview(batch);

              return (
                <div
                  key={batch[0].id}
                  onClick={() => handleViewBatch(batch)}
                  className="group relative bg-main border-white/[0.08] rounded-xl p-5 cursor-pointer hover:border-blue-accent/20 transition-colors overflow-hidden flex flex-col gap-3 min-h-36"
                >
                  {/* Left accent bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-0.75 rounded-r opacity-60 ${
                      isGeneral ? "bg-teal-500" : "bg-blue-accent"
                    }`}
                  />

                  {/* Badges row + delete button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-bold uppercase rounded px-2 py-0.5 ${
                          isGeneral
                            ? "bg-teal-500/10 text-teal-400"
                            : "bg-blue-accent/10 text-text-secondary"
                        }`}
                      >
                        {isGeneral ? "GENERAL" : "CUSTOMIZE"}
                      </span>
                      <span className="bg-white/5 text-text-muted text-[9px] font-bold uppercase rounded px-2 py-0.5">
                        {formatLabel}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteBatch(e, batch)}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded border border-transparent text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-150"
                      aria-label="Delete summary"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Preview / status */}
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <span className="text-amber-400 text-xs font-medium">Processing…</span>
                    </div>
                  ) : (
                    <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">
                      {preview}
                    </p>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <Clock className="w-3 h-3 text-text-muted shrink-0" />
                    <span className="text-text-muted text-[10px]">{createdDate}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
