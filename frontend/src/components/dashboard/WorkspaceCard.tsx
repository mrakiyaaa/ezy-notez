"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Workspace } from "@/types/workspace";
import { deleteWorkspaceApi } from "@/api/workspace.api";
import AuraIndicator from "@/components/ui/AuraIndicator";

interface WorkspaceCardProps {
  workspace: Workspace;
  onOpen?: (slug: string) => void;
  onDelete?: (id: string) => void;
}

export default function WorkspaceCard({
  workspace,
  onOpen,
  onDelete,
}: WorkspaceCardProps) {
  const auraHex = workspace.aura;
  // Backend returns created_at (snake_case); fall back if camelCase mapping is absent
  const rawDate = workspace.createdAt ?? (workspace as unknown as { created_at: string }).created_at;
  const created = rawDate ? new Date(rawDate).toLocaleDateString() : "";
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(false);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await deleteWorkspaceApi(workspace.id);
      try {
        localStorage.removeItem(`workspace-aura-${workspace.id}`);
        localStorage.removeItem(`workspace-aura-slug-${workspace.slug}`);
      } catch { /* */ }
      onDelete?.(workspace.id);
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      setDeleting(false);
      setConfirming(false);
    }
  };

  const handleOpen = () => {
    try {
      localStorage.setItem(`workspace-aura-${workspace.id}`, workspace.aura);
      localStorage.setItem(`workspace-aura-slug-${workspace.slug}`, workspace.aura);
    } catch { /* localStorage unavailable */ }
    onOpen?.(workspace.slug);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        className="group relative flex h-full min-h-55 flex-col w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] backdrop-blur-md p-5 text-left shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 cursor-pointer"
      >
        {/* Delete icon — visible on card hover */}
        <button
          type="button"
          onClick={handleDeleteClick}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10 text-text-muted hover:text-white"
          aria-label="Delete workspace"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <AuraIndicator hex={auraHex} />
                <p className="text-xs uppercase tracking-[0.3em] text-text-muted">
                  {workspace.aura_keyword} aura
                </p>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-text-primary">
                {workspace.name}
              </h3>
            </div>
          </div>
          {workspace.description && (
            <p className="mt-3 text-sm text-white/70">{workspace.description}</p>
          )}
        </div>
        {created && (
          <p className="mt-5 text-xs text-white/50">Created {created}</p>
        )}
      </div>

      {/* Confirmation dialog */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] border border-white/10 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-text-primary">Delete workspace?</h3>
            <p className="mt-2 text-sm text-white/60">
              <span className="font-medium text-white/80">{workspace.name}</span> will be permanently deleted. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={deleting}
                className="flex-1 rounded-lg border border-white/20 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-red-600 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
