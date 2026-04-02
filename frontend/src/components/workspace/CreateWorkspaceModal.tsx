"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createWorkspaceApi } from "@/api/workspace.api";
import { CreateWorkspaceInput } from "@/types/workspace";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slug: string) => void;
}

const AURA_COLORS = [
  { value: "#FF6B6B", label: "Red",    keyword: "Crimson Blaze" },
  { value: "#4ECDC4", label: "Teal",   keyword: "Neon Tide"     },
  { value: "#45B7D1", label: "Blue",   keyword: "Arctic"        },
  { value: "#FFA07A", label: "Salmon", keyword: "Ember"         },
  { value: "#98D8C8", label: "Mint",   keyword: "Frosted"       },
  { value: "#F7DC6F", label: "Yellow", keyword: "Sunburst"      },
  { value: "#BB8FCE", label: "Purple", keyword: "Nebula"        },
  { value: "#85C1E2", label: "Sky",    keyword: "Glitch"        },
];

const DEFAULT_KEYWORD = AURA_COLORS[0].keyword;

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const [formData, setFormData] = useState<CreateWorkspaceInput>({
    name: "",
    description: "",
    aura: AURA_COLORS[0].value,
    auraKeyword: DEFAULT_KEYWORD,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleAuraChange = (auraValue: string) => {
    const keyword = AURA_COLORS.find((c) => c.value === auraValue)?.keyword ?? "";
    setFormData((prev) => ({
      ...prev,
      aura: auraValue,
      auraKeyword: keyword,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        setError("Workspace name is required");
        setLoading(false);
        return;
      }

      const workspace = await createWorkspaceApi(formData);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        aura: AURA_COLORS[0].value,
        auraKeyword: DEFAULT_KEYWORD,
      });
      
      onClose();
      onSuccess(workspace.slug);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create workspace";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-text-primary">
          Create Workspace
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workspace Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary">
              Workspace Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Spring 2026 Study"
              disabled={loading}
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-blue-accent focus:outline-none focus:ring-1 focus:ring-blue-accent disabled:bg-white/10 disabled:text-white/50"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-primary">
              Description <span className="text-white/50 text-xs">(Optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="What is this workspace for?"
              disabled={loading}
              rows={3}
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-blue-accent focus:outline-none focus:ring-1 focus:ring-blue-accent disabled:bg-white/10 disabled:text-white/50"
            />
          </div>

          {/* Aura Color Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Select Aura <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {AURA_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleAuraChange(color.value)}
                  disabled={loading}
                  className={`relative h-12 rounded-lg transition-all ${
                    formData.aura === color.value
                      ? "ring-2 ring-offset-2 ring-blue-accent scale-110"
                      : "hover:scale-105"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {formData.aura === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Aura Keyword */}
          <div>
            <label htmlFor="auraKeyword" className="block text-sm font-medium text-text-primary">
              Aura Keyword <span className="text-red-500">*</span>
            </label>
            <input
              id="auraKeyword"
              type="text"
              name="auraKeyword"
              value={formData.auraKeyword}
              onChange={handleInputChange}
              placeholder="e.g., Sunburst"
              disabled={loading}
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-blue-accent focus:outline-none focus:ring-1 focus:ring-blue-accent disabled:bg-white/10 disabled:text-white/50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Button Group */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-fade-border bg-white/10 backdrop-blur-md hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 bg-blue-accent hover:bg-blue-accent/90"
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
