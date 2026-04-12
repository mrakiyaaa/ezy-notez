import {
  FileText,
  Presentation,
  Image as ImageIcon,
  Music,
  Video,
} from "lucide-react";
import type { ResourceType } from "@/types/resource";
import type { Summary, SummaryFormat } from "@/types/summary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SummarizationMode = "general" | "customize";
export type SummarizationPhase = "configure" | "processing" | "results";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FORMAT_OPTIONS: { id: SummaryFormat; label: string }[] = [
  { id: "bullet", label: "Bullet Points" },
  { id: "short", label: "Short Paragraph" },
  { id: "detailed", label: "Detailed" },
];

export const RESOURCE_TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  pdf: FileText,
  ppt: Presentation,
  image: ImageIcon,
  audio: Music,
  youtube: Video,
};

/** Summaries created within this window are considered part of the same batch */
export const BATCH_TIME_THRESHOLD_MS = 60_000;

/** Maximum characters for history card preview text */
export const PREVIEW_MAX_CHARS = 80;

/** Interval between summary status polls */
export const POLLING_INTERVAL_MS = 3_000;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Group summaries into batches by creation-time proximity */
export function groupIntoBatches(summaries: Summary[]): Summary[][] {
  if (summaries.length === 0) return [];

  const sorted = [...summaries].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const batches: Summary[][] = [];
  let currentBatch: Summary[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.abs(
      new Date(currentBatch[0].created_at).getTime() -
        new Date(sorted[i].created_at).getTime()
    );
    if (gap < BATCH_TIME_THRESHOLD_MS) {
      currentBatch.push(sorted[i]);
    } else {
      batches.push(currentBatch);
      currentBatch = [sorted[i]];
    }
  }
  batches.push(currentBatch);
  return batches;
}

/** Generate a plain-text preview from a batch's first ready summary */
export function getBatchPreview(batch: Summary[]): string {
  const readySummary = batch.find(
    (summary) => summary.content && summary.status === "ready"
  );
  if (!readySummary?.content) return "Summary pending\u2026";

  const plainText = readySummary.content
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();

  return plainText.length > PREVIEW_MAX_CHARS
    ? plainText.slice(0, PREVIEW_MAX_CHARS) + "\u2026"
    : plainText;
}

/** Look up the display label for a summary format */
export function getFormatLabel(format: SummaryFormat): string {
  return FORMAT_OPTIONS.find((option) => option.id === format)?.label ?? format;
}

/** Format a date string for display in summary cards */
export function formatSummaryDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Count words in summary content */
export function getWordCount(content: string | null): number {
  if (!content) return 0;
  return content.split(/\s+/).filter(Boolean).length;
}
