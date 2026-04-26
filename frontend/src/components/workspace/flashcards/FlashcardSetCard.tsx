"use client";

import { useState } from "react";
import { Trash2, Play, FileText, Calendar } from "lucide-react";
import type { FlashcardSet } from "./constants";
import { formatFlashcardDate } from "./constants";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";

interface FlashcardSetCardProps {
  set: FlashcardSet;
  onStudy: (set: FlashcardSet) => void;
  onDelete: (id: string) => void;
}

export default function FlashcardSetCard({
  set,
  onStudy,
  onDelete,
}: FlashcardSetCardProps) {
  const total = set.cards.length;
  const known = set.knownIds.length;
  const progressPct = total > 0 ? (known / total) * 100 : 0;
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
    <div
      className="group rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-text-primary text-sm font-semibold leading-snug line-clamp-2 flex-1">
          {set.title}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          className="shrink-0 p-1.5 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
          aria-label="Delete set"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-muted text-xs truncate">{set.resourceName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-muted text-xs">{formatFlashcardDate(set.createdAt)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            backgroundColor: "rgba(80, 125, 188, 0.12)",
            color: "var(--color-blue-accent)",
          }}
        >
          {total} cards
        </span>
        <span className="text-text-muted text-xs">
          {known} / {total} known
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, backgroundColor: "var(--color-blue-accent)" }}
        />
      </div>

      {/* Study button */}
      <button
        onClick={() => onStudy(set)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: "rgba(80, 125, 188, 0.1)",
          color: "var(--color-blue-accent)",
          border: "1px solid rgba(80, 125, 188, 0.2)",
        }}
      >
        <Play className="w-3.5 h-3.5" />
        Study
      </button>
    </div>

    <DeleteConfirmationModal
      isOpen={showConfirm}
      itemName={set.title}
      onConfirm={() => { setShowConfirm(false); onDelete(set.id); }}
      onCancel={() => setShowConfirm(false)}
    />
    </>
  );
}
