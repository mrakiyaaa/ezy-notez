"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemName: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  itemName,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { e.stopPropagation(); if (!isDeleting) onCancel(); }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: "rgba(255, 255, 255, 0.07)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + heading */}
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/15 border border-red-500/20">
            <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
          </div>
          <h3 className="text-text-primary font-semibold text-base leading-snug">
            Are you sure?
          </h3>
        </div>

        {/* Body */}
        <p className="text-sm text-text-muted leading-relaxed">
          You are about to delete{" "}
          <span className="font-semibold text-text-primary">&ldquo;{itemName}&rdquo;</span>.
          This action cannot be undone.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-secondary transition-all duration-150 disabled:opacity-40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => { (e.currentTarget.style.background = "rgba(255,255,255,0.1)"); }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = "rgba(255,255,255,0.06)"); }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-40"
            style={{
              background: isDeleting
                ? "rgba(239,68,68,0.5)"
                : "rgba(239,68,68,0.85)",
              border: "1px solid rgba(239,68,68,0.4)",
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) e.currentTarget.style.background = "rgba(239,68,68,1)";
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) e.currentTarget.style.background = "rgba(239,68,68,0.85)";
            }}
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting…
              </span>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
