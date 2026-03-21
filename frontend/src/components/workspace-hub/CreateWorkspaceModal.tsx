"use client";

import { useMemo, useState } from "react";
import type { CreateWorkspaceInput, Workspace } from "@/types/workspace";
import { workspaceService } from "@/lib/services/workspace.service";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (workspace: Workspace) => void;
}

const auraOptions = ["blue", "violet", "mint", "amber", "stone"];

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreate,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aura, setAura] = useState("blue");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isDisabled = useMemo(
    () => isSaving || name.trim().length === 0,
    [isSaving, name],
  );

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    if (name.trim().length === 0) {
      setError("Workspace name is required.");
      return;
    }

    setIsSaving(true);
    setError("");

    const payload: CreateWorkspaceInput = {
      name,
      description,
      aura,
      auraKeyword: aura,
    };

    const created = await workspaceService.createWorkspace(payload);
    onCreate(created);

    setName("");
    setDescription("");
    setAura("blue");
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Create New Workspace</h2>
            <p className="mt-1 text-sm text-white/60">
              Set the foundation for your next research project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm text-white/70">
            Workspace Name <span className="text-rose-400">*</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Quantum physics thesis"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
            />
          </label>
          <label className="block text-sm text-white/70">
            Research Objectives
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a short mission statement for this workspace"
              className="mt-2 min-h-[90px] w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
            />
          </label>
          <div>
            <p className="text-sm text-white/70">Select Aura</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {auraOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAura(option)}
                  className={`h-8 w-8 rounded-full border ${
                    aura === option
                      ? "border-white/80 ring-2 ring-white/20"
                      : "border-white/20"
                  } bg-white/10 transition hover:border-white/60`}
                  aria-label={`Select ${option} aura`}
                />
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-rose-400">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="mt-6 w-full rounded-xl bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Launching..." : "Launch Workspace"}
        </button>
        <p className="mt-2 text-center text-xs text-white/40">
          By launching, you initialize a private AI instance for research notes.
        </p>
      </div>
    </div>
  );
}
