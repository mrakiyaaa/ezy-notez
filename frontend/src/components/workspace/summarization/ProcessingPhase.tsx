import { Sparkles, Loader2 } from "lucide-react";
import type { Summary } from "@/types/summary";
import type { AuraProps } from "./constants";

interface ProcessingPhaseProps extends AuraProps {
  summaries: Summary[];
}

export default function ProcessingPhase({
  auraHex,
  auraRgb,
  summaries,
}: ProcessingPhaseProps) {
  const completedCount = summaries.filter(
    (summary) => summary.status === "ready"
  ).length;

  return (
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
          {completedCount} / {summaries.length} complete
        </div>
      )}
    </div>
  );
}
