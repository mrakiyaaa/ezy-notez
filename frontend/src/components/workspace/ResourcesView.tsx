"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Upload, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import ResourceItem from "@/components/workspace/ResourceItem";
import { useProfile } from "@/hooks/useProfile";
import { useUploadThing } from "@/hooks/useUploadThing";
import {
  getWorkspaceResources,
  getWorkspaceBySlug,
  insertResource,
  updateResourceStatus,
  deleteResource,
  triggerExtraction,
  triggerAudioExtraction,
  triggerPptxExtraction,
  createYoutubeResource,
} from "@/services/resource.service";
import type { Resource, ResourceType, ResourceStatus } from "@/types/resource";

export type TabItem = "all" | "pdfs" | "ppts" | "audio" | "youtube";

export const filterTabs: { id: TabItem; label: string }[] = [
  { id: "all", label: "All Files" },
  { id: "pdfs", label: "PDFs" },
  { id: "ppts", label: "PPTs" },
  { id: "audio", label: "Audio" },
  { id: "youtube", label: "Youtube" },
];

function getMimeType(file: File): ResourceType {
  const mime = file.type.toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (
    mime === "application/vnd.ms-powerpoint" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "ppt";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "pdf"; // fallback
}

/** Maps file extensions to the extraction service function for that type. */
const EXTENSION_EXTRACTORS: {
  extensions: string[];
  trigger: (resourceId: string, url: string) => Promise<void>;
}[] = [
  { extensions: [".pdf"], trigger: triggerExtraction },
  { extensions: [".ppt", ".pptx"], trigger: triggerPptxExtraction },
  { extensions: [".mp3", ".wav", ".m4a", ".webm", ".ogg", ".mp4a"], trigger: triggerAudioExtraction },
];

/** Returns the extraction trigger function for the given filename, or null if none. */
function getExtractor(fileName: string): ((id: string, url: string) => Promise<void>) | null {
  const lower = fileName.toLowerCase();
  return EXTENSION_EXTRACTORS.find(({ extensions }) =>
    extensions.some((ext) => lower.endsWith(ext))
  )?.trigger ?? null;
}

interface ResourcesViewProps {
  activeTab: TabItem;
  setActiveTab: (tab: TabItem) => void;
}

export default function ResourcesView({
  activeTab,
  setActiveTab,
}: ResourcesViewProps) {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useProfile();

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadsRef = useRef<Map<string, string>>(new Map());

  // YouTube URL input state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isAddingYoutube, setIsAddingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // Resolve workspace id from slug via backend API
  useEffect(() => {
    if (!slug) {
      setLoadError("No workspace slug provided");
      setIsLoading(false);
      return;
    }

    let mounted = true;

    getWorkspaceBySlug(slug)
      .then((ws) => {
        if (!mounted) return;
        if (!ws) {
          setLoadError(`Workspace not found for slug: ${slug}`);
          setIsLoading(false);
        } else {
          setWorkspaceId(ws.id);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to get workspace:", err);
        setLoadError(`Failed to load workspace: ${err.message}`);
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  // Load existing resources
  const loadResources = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getWorkspaceResources(workspaceId);
      setResources(data);
    } catch (err) {
      console.error("Failed to load resources:", err);
      setLoadError(`Failed to load resources: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // UploadThing hook
  const { startUpload, isUploading } = useUploadThing("resourceUploader", {
    onClientUploadComplete: async (res: { name: string; url: string; ufsUrl?: string }[]) => {
      if (!res) return;
      for (const file of res) {
        const url = file.ufsUrl ?? file.url;
        const resourceId = pendingUploadsRef.current.get(file.name);

        if (!resourceId) {
          console.error(`No pending resource found for "${file.name}". Status may not have been saved.`);
          continue;
        }

        const triggerFn = getExtractor(file.name);

        if (triggerFn) {
          setResources((prev) =>
            prev.map((r) =>
              r.id === resourceId ? { ...r, status: "indexing" as ResourceStatus, url } : r
            )
          );

          try {
            await updateResourceStatus(resourceId, "indexing", url);
          } catch (err) {
            console.error("Failed to set status to indexing:", err);
          }

          triggerFn(resourceId, url)
            .then(() => {
              setResources((prev) =>
                prev.map((r) =>
                  r.id === resourceId ? { ...r, status: "ready" as ResourceStatus } : r
                )
              );
            })
            .catch(() => {
              setResources((prev) =>
                prev.map((r) =>
                  r.id === resourceId ? { ...r, status: "failed" as ResourceStatus } : r
                )
              );
            });
        } else {
          setResources((prev) =>
            prev.map((r) =>
              r.id === resourceId && r.status !== "ready"
                ? { ...r, status: "ready" as ResourceStatus, url }
                : r
            )
          );

          try {
            await updateResourceStatus(resourceId, "ready", url);
          } catch (err) {
            console.error("Failed to update resource status:", err);
          }
        }

        pendingUploadsRef.current.delete(file.name);
      }
    },
    onUploadError: (err: Error) => {
      console.error("Upload error:", err);
      pendingUploadsRef.current.clear();
    },
  });

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !workspaceId || !user) return;

    const fileArray = Array.from(files);

    const newResources: Resource[] = [];
    for (const file of fileArray) {
      const resourceType = getMimeType(file);
      try {
        const resource = await insertResource({
          user_id: user.id,
          workspace_id: workspaceId,
          name: file.name,
          url: "",
          size: file.size,
          type: resourceType,
          status: "uploading",
        });
        newResources.push(resource);
        pendingUploadsRef.current.set(file.name, resource.id);
      } catch (err) {
        console.error("Failed to insert resource:", err);
      }
    }

    setResources((prev) => [...newResources, ...prev]);

    try {
      await startUpload(fileArray);
    } catch (err) {
      console.error("Upload failed:", err);
    }

    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // YouTube URL handling
  const isValidYoutubeUrl = (url: string): boolean =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/.test(
      url.trim()
    );

  const handleAddYoutube = async () => {
    if (!workspaceId || !user) return;

    const trimmed = youtubeUrl.trim();
    if (!isValidYoutubeUrl(trimmed)) {
      setYoutubeError("Please enter a valid YouTube URL");
      return;
    }

    setYoutubeError(null);
    setIsAddingYoutube(true);

    try {
      const resource = await createYoutubeResource({
        workspace_id: workspaceId,
        youtube_url: trimmed,
      });
      setResources((prev) => [resource, ...prev]);
      setYoutubeUrl("");
    } catch (err) {
      console.error("Failed to add YouTube resource:", err);
      setYoutubeError("Failed to add YouTube video. Please try again.");
    } finally {
      setIsAddingYoutube(false);
    }
  };

  // Poll for status updates when resources are indexing
  useEffect(() => {
    const hasIndexing = resources.some((r) => r.status === "indexing");
    if (!hasIndexing || !workspaceId) return;

    const interval = setInterval(async () => {
      try {
        const data = await getWorkspaceResources(workspaceId);
        setResources(data);
        if (!data.some((r) => r.status === "indexing")) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling failed:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [resources.some((r) => r.status === "indexing"), workspaceId]);

  const tabTypeMap: Record<TabItem, ResourceType | null> = {
    all: null,
    pdfs: "pdf",
    ppts: "ppt",
    audio: "audio",
    youtube: "youtube",
  };

  const filtered =
    activeTab === "all"
      ? resources
      : resources.filter((r) => r.type === tabTypeMap[activeTab]);

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.ppt,.pptx,image/*,audio/*"
        onChange={handleFilesSelected}
      />

      {/* Upload Card */}
      <div
        className="mx-6 mt-6 border-2 border-dashed border-fade-border bg-bg-card rounded-xl p-12 text-center"
      >
        <div
          className="p-4 rounded-full mx-auto mb-4 w-fit"
          style={{ backgroundColor: "rgba(80, 125, 188, 0.1)" }}
        >
          <Upload className="w-8 h-8" style={{ color: "var(--color-blue-accent)" }} />
        </div>
        <h2 className="text-text-primary font-bold text-xl">
          Upload Academic Resources
        </h2>
        <p className="text-text-muted text-sm mt-2">
          Drag and drop PDFs, PPTs, or paste YouTube links to start AI
          processing.
        </p>
        <Button
          onClick={handleSelectFiles}
          disabled={isUploading || !workspaceId}
          className="rounded-lg px-8 py-2 mt-6 mx-auto block disabled:opacity-50"
          style={{ backgroundColor: "var(--color-blue-accent)", color: "#ffffff" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </span>
          ) : (
            "Select Files"
          )}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-4 mt-6 mx-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs">or paste a YouTube link</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* YouTube URL Input */}
        <div className="flex items-center gap-2 mt-4 mx-8">
          <div
            className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2 border"
            style={{
              borderColor: youtubeError
                ? "rgb(248, 113, 113)"
                : "var(--color-fade-border)",
              backgroundColor: "rgba(80, 125, 188, 0.04)",
            }}
          >
            <Video className="w-5 h-5 text-red-500 shrink-0" />
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                setYoutubeError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddYoutube()}
              className="bg-transparent text-text-primary text-sm flex-1 outline-none placeholder:text-text-muted"
              disabled={isAddingYoutube || !workspaceId}
            />
          </div>
          <Button
            onClick={handleAddYoutube}
            disabled={isAddingYoutube || !workspaceId || !youtubeUrl.trim()}
            className="rounded-lg px-6 py-2 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-blue-accent)", color: "#ffffff" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {isAddingYoutube ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
        {youtubeError && (
          <p className="text-red-400 text-xs mt-2 mx-8">{youtubeError}</p>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mx-6 mt-4 flex items-center gap-1">
        {filterTabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={
              activeTab === id
                ? "rounded-full px-4 py-1 text-sm"
                : "text-text-muted px-4 py-1 text-sm hover:text-text-primary transition-colors"
            }
            style={
              activeTab === id
                ? { backgroundColor: "var(--color-blue-accent)", color: "#ffffff" }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Resource List */}
      {loadError ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <div className="text-red-400 text-center max-w-md">
            <p className="font-semibold mb-2">Unable to Load Resources</p>
            <p className="text-sm">{loadError}</p>
            <details className="text-xs text-text-muted mt-4 cursor-pointer">
              <summary>Debug Info</summary>
              <pre className="mt-2 bg-main p-2 rounded text-left text-xs overflow-auto">
Workspace slug: {slug}
Current URL: {typeof window !== "undefined" ? window.location.pathname : "N/A"}
              </pre>
            </details>
            <p className="text-xs text-text-muted mt-4">1. Open browser DevTools (F12)</p>
            <p className="text-xs text-text-muted">2. Check Console tab for detailed Supabase errors</p>
            <p className="text-xs text-text-muted">3. Verify workspace exists in Supabase dashboard</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center mt-20">
          <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="mx-6 mt-4 flex flex-col gap-3 pb-6">
          {filtered.map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-20">
          <h3 className="text-text-primary font-semibold text-xl">
            {activeTab === "all"
              ? "Your resources are empty"
              : `No ${activeTab} files`}
          </h3>
          <p className="text-text-muted text-sm mt-2">
            Upload resources first
          </p>
        </div>
      )}
    </>
  );
}
