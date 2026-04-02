"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft } from "lucide-react";
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

  const auraProps = { auraHex, auraRgb, auraContrast };

  if (phase === "processing") {
    return (
      <div className="h-full overflow-y-auto">
        <ProcessingPhase {...auraProps} summaries={summaries} />
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
          {...auraProps}
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
        {...auraProps}
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
}
