"use client";

import { useState, useEffect } from "react";
import { FileText, Presentation, Music, Loader2 } from "lucide-react";
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
      <div className="flex items-center justify-center py-8 rounded-xl border border-fade-border bg-main">
        <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
        <span className="text-text-muted text-xs ml-2">Loading resources…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-4 text-center">
        <p className="text-red-400 text-xs">{error}</p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-fade-border bg-main px-4 py-6 text-center">
        <FileText className="w-6 h-6 text-text-muted mx-auto mb-2" />
        <p className="text-text-muted text-xs">No ready resources found.</p>
        <p className="text-text-muted text-[10px] mt-1">Upload and process resources first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Meta row */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-text-muted text-xs">
          {selectedIds.size} of {resources.length} selected
        </span>
        <div className="flex items-center">
          <button
            onClick={selectAll}
            className="text-blue-accent text-xs cursor-pointer hover:opacity-75 transition-opacity"
          >
            Select all
          </button>
          <span className="text-text-muted mx-1">·</span>
          <button
            onClick={clearAll}
            className="text-blue-accent text-xs cursor-pointer hover:opacity-75 transition-opacity"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Resource pills */}
      <div className="flex flex-wrap gap-2">
        {resources.map((resource) => {
          const isSelected = selectedIds.has(resource.id);
          let Icon = FileText;
          if (resource.type === "ppt") Icon = Presentation;
          else if (resource.type === "audio") Icon = Music;

          return (
            <button
              key={resource.id}
              onClick={() => toggleResource(resource.id)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer max-w-57.5 transition-all duration-150",
                isSelected
                  ? "bg-blue-accent/10 border-blue-accent/50 text-text-secondary"
                  : "bg-main border-fade-border text-text-muted hover:border-[#253040]",
              ].join(" ")}
            >
              <Icon className="w-2.75 h-2.75 shrink-0" />
              <span className="truncate">{resource.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
