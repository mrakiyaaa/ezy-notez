"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import {
  deleteWorkspaceApi,
  getWorkspacesApi,
} from "@/api/workspace.api";
import type { Workspace } from "@/types/workspace";

export default function SettingsWorkspacePage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await getWorkspacesApi();
      setWorkspaces(list);
    } catch (err) {
      console.error("[SettingsWorkspace] Failed to load workspaces:", err);
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (ws: Workspace) => {
    if (
      !confirm(
        `Delete workspace "${ws.name}"? This will also remove its resources and cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(ws.id);
    try {
      await deleteWorkspaceApi(ws.id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
    } catch (err) {
      console.error("[SettingsWorkspace] Failed to delete workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">Workspace settings</h1>
          <p className="text-text-muted text-sm mt-1">
            Manage the workspaces on your account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/workspaces")}
          className="bg-blue-accent text-white font-semibold text-sm rounded-lg px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" />
          New workspace
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="py-12 px-6 text-center text-text-muted text-sm">
            You don&apos;t have any workspaces yet.
          </div>
        ) : (
          <ul className="divide-y divide-fade-border">
            {workspaces.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: ws.aura || "#507DBC" }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {ws.name}
                  </div>
                  {ws.description && (
                    <div className="text-xs text-text-muted truncate mt-0.5">
                      {ws.description}
                    </div>
                  )}
                </div>
                <Link
                  href={`/workspaces/${ws.slug}`}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Open
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(ws)}
                  disabled={deletingId === ws.id}
                  aria-label={`Delete ${ws.name}`}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingId === ws.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
