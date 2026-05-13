import { Sparkles, Loader2, X } from "lucide-react";
import type { Summary } from "@/types/summary";

interface ProcessingPhaseProps {
  summaries: Summary[];
  onCancel: () => void;
}

export default function ProcessingPhase({
  summaries,
  onCancel,
}: ProcessingPhaseProps) {
  const completedCount = summaries.filter(
    (summary) => summary.status === "ready"
  ).length;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
        >
          <Sparkles className="w-8 h-8" style={{ color: "var(--color-blue-accent)" }} />
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
      <div className="w-64 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full animate-pulse"
          style={{
            backgroundColor: "var(--color-blue-accent)",
            width: "60%",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      </div>
      {summaries.length > 0 && (
        <div className="flex items-center gap-2 text-text-muted text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          {completedCount} / {summaries.length} complete
        </div>
      )}
      <button
        onClick={onCancel}
        className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-muted border border-white/10 hover:bg-white/5 hover:text-text-primary hover:border-white/20 transition-all duration-150"
      >
        <X className="w-3.5 h-3.5" />
        Cancel
      </button>
    </div>
  );
}
