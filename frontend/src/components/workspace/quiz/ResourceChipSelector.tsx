"use client";

import { useState, useEffect } from "react";
import { Check, FileText, Loader2 } from "lucide-react";
import type { Resource } from "@/types/resource";
import { getWorkspaceResources } from "@/services/resource.service";

interface ResourceChipSelectorProps {
  workspaceId: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export default function ResourceChipSelector({
  workspaceId,
  selectedIds,
  onSelectionChange,
}: ResourceChipSelectorProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    getWorkspaceResources(workspaceId)
      .then((res) => {
        if (mounted) {
          // Only resources with extracted text can be used for quiz generation
          const readyResources = res.filter(
            (r) => r.status === "ready" && r.extracted_text
          );
          setResources(readyResources);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load resources");
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  const toggleResource = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const selectAll = () => {
    onSelectionChange(new Set(resources.map((r) => r.id)));
  };

  const clearAll = () => {
    onSelectionChange(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 rounded-xl border border-fade-border bg-white/[0.02]">
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--color-text-muted)" }}
        />
        <span className="text-text-muted text-sm ml-2">Loading resources…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-4 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-fade-border bg-white/[0.02] px-4 py-6 text-center">
        <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="text-text-muted text-sm">No ready resources found.</p>
        <p className="text-text-muted text-xs mt-1">
          Upload and process resources first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header with select/clear actions */}
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-xs">
          {selectedIds.size} of {resources.length} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Select all
          </button>
          <span className="text-text-muted">·</span>
          <button
            onClick={clearAll}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Resource chips grid */}
      <div className="flex flex-wrap gap-2">
        {resources.map((resource) => {
          const isSelected = selectedIds.has(resource.id);
          return (
            <button
              key={resource.id}
              onClick={() => toggleResource(resource.id)}
              className="group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150"
              style={{
                backgroundColor: isSelected
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(255, 255, 255, 0.02)",
                borderColor: isSelected
                  ? "var(--color-blue-accent)"
                  : "var(--color-fade-border)",
              }}
            >
              {/* Checkbox indicator */}
              <div
                className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-150"
                style={{
                  borderColor: isSelected ? "var(--color-blue-accent)" : "var(--color-fade-border)",
                  backgroundColor: isSelected ? "var(--color-blue-accent)" : "transparent",
                }}
              >
                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </div>

              {/* Resource icon and name */}
              <FileText
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: isSelected ? "var(--color-blue-accent)" : "var(--color-text-muted)" }}
              />
              <span
                className="text-sm truncate max-w-[180px]"
                style={{
                  color: isSelected
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                }}
              >
                {resource.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
