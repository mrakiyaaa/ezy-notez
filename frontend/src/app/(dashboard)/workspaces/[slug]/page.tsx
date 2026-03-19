 "use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Brain,
  ClipboardList,
  Settings,
  Upload,
  Search,
  Sparkles,
  Layers,
  FileText,
  Presentation,
  Image as ImageIcon,
  Music,
  Trash2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/hooks/useProfile";
import {
  Resource,
  ResourceType,
  ResourceStatus,
  type WorkspaceInfo,
  getWorkspaceResources,
  getWorkspaceBySlug,
  insertResource,
  updateResourceStatus,
  deleteResource,
  triggerExtraction,
} from "@/lib/resources";
import { useUploadThing } from "@/lib/uploadthing-hook";

type NavItem = "home" | "resources" | "chattie" | "studyroom" | "quiz";
type TabItem = "all" | "pdfs" | "ppts" | "audio" | "youtube";

const navItems: { id: NavItem; icon: React.ElementType; label: string }[] = [
  { id: "home", icon: LayoutDashboard, label: "Home" },
  { id: "resources", icon: BookOpen, label: "Resources" },
  { id: "chattie", icon: MessageCircle, label: "Chattie" },
  { id: "studyroom", icon: Brain, label: "Study Room" },
  { id: "quiz", icon: ClipboardList, label: "Quiz" },
];

const filterTabs: { id: TabItem; label: string }[] = [
  { id: "all", label: "All Files" },
  { id: "pdfs", label: "PDFs" },
  { id: "ppts", label: "PPTs" },
  { id: "audio", label: "Audio" },
  { id: "youtube", label: "Youtube" },
];

// ─── Helpers ─────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return `${diffD} days ago`;
}

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

// ─── Main Page ───────────────────────────────────────────

// ─── Aura helpers ────────────────────────────────────────
/** Convert a hex color like "#4ECDC4" to "78, 205, 196" for use in rgba(). */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Return "#000000" or "#ffffff" for legible text on a given hex background. */
function getContrastColor(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 128 ? "#000000" : "#ffffff";
}

/** View-name → subtitle mapping for the header. */
const navSubtitles: Record<NavItem, string> = {
  home: "Overview",
  resources: "Resource Management",
  chattie: "AI Chat",
  studyroom: "Study Room",
  quiz: "Quizzes",
};

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("resources");
  const [activeTab, setActiveTab] = useState<TabItem>("all");

  // Read cached aura synchronously from localStorage on first render
  const cachedAura = (() => {
    if (!slug) return null;
    try { return localStorage.getItem(`workspace-aura-slug-${slug}`); }
    catch { return null; }
  })();

  // Fetch workspace data (including aura) once at the top level
  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    getWorkspaceBySlug(slug).then((ws) => {
      if (mounted && ws) {
        setWorkspace(ws);
        // Update localStorage with confirmed value
        try {
          localStorage.setItem(`workspace-aura-${ws.id}`, ws.aura);
          localStorage.setItem(`workspace-aura-slug-${slug}`, ws.aura);
        } catch { /* */ }
      }
    });
    return () => { mounted = false; };
  }, [slug]);

  // Derive CSS-ready aura values: use API data > cached > fallback
  const auraHex = workspace?.aura || cachedAura || "#507DBC";
  const auraRgb = hexToRgb(auraHex);
  const auraContrast = getContrastColor(auraHex);

  return (
    <div
      className="flex min-h-screen bg-main"
      style={{
        "--workspace-aura": auraHex,
        "--workspace-aura-rgb": auraRgb,
      } as React.CSSProperties}
    >
      {/* Left Sidebar */}
      <TooltipProvider delayDuration={0}>
        <aside className="w-16 flex flex-col items-center border-r border-fade-border bg-main py-4">
          {/* Top nav icons */}
          <div className="flex flex-col items-center gap-2 flex-1">
            {navItems.map(({ id, icon: Icon, label }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveNav(id)}
                    className={
                      activeNav === id
                        ? "bg-bg-card rounded-xl p-2"
                        : "text-text-muted p-2 transition-colors"
                    }
                    style={
                      activeNav === id
                        ? { color: auraHex }
                        : undefined
                    }
                    onMouseEnter={(e) => {
                      if (activeNav !== id)
                        e.currentTarget.style.color = auraHex;
                    }}
                    onMouseLeave={(e) => {
                      if (activeNav !== id)
                        e.currentTarget.style.color = "";
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Bottom icons */}
          <div className="flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-text-muted p-2 transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.color = auraHex; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = ""; }}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: auraHex }}
            />
          </div>
        </aside>
      </TooltipProvider>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header
          className="w-full bg-main px-6 py-4 flex items-center"
          style={{ borderBottom: `1px solid rgba(${auraRgb}, 0.15)` }}
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/workspaces")}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Back to workspaces"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-text-primary font-bold text-lg">
                {workspace?.name ?? "Loading…"}
              </h1>
              <p className="text-text-muted text-sm">
                {navSubtitles[activeNav]}
              </p>
            </div>
          </div>

          {/* Right search */}
          <div className="relative w-96 ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search Projects"
              className="w-full bg-bg-card border border-fade-border rounded-lg pl-10 pr-4 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = auraHex; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
            />
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto">
          {activeNav === "resources" && (
            <ResourcesView
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              auraHex={auraHex}
              auraRgb={auraRgb}
              auraContrast={auraContrast}
            />
          )}
          {activeNav === "home" && <HomeView />}
          {activeNav === "chattie" && <ChattieView />}
          {activeNav === "studyroom" && <StudyRoomView />}
          {activeNav === "quiz" && <QuizView />}
        </main>
      </div>
    </div>
  );
}

/* ─── Resources View ─── */
function ResourcesView({
  activeTab,
  setActiveTab,
  auraHex,
  auraRgb,
  auraContrast,
}: {
  activeTab: TabItem;
  setActiveTab: (tab: TabItem) => void;
  auraHex: string;
  auraRgb: string;
  auraContrast: string;
}) {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useProfile();

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Maps file name → resource ID for in-flight uploads; avoids stale-closure issues
  const pendingUploadsRef = useRef<Map<string, string>>(new Map());

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
      console.log("Skipping resource load - no workspace ID yet");
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
          console.warn(`No pending resource found for "${file.name}". Status may not have been saved.`);
          continue;
        }

        // Determine resource type from the file name to decide extraction path
        const isPdf = file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          // Optimistically show 'indexing' while the backend extracts text
          setResources((prev) =>
            prev.map((r) =>
              r.id === resourceId ? { ...r, status: "indexing" as ResourceStatus, url } : r
            )
          );

          // Persist URL first so the row is fetchable
          try {
            await updateResourceStatus(resourceId, "indexing", url);
          } catch (err) {
            console.error("Failed to set status to indexing:", err);
          }

          // Trigger extraction — backend sets status to 'ready' or 'failed'
          triggerExtraction(resourceId, url)
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
          // Non-PDF files are immediately ready
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

  // Handle file selection
  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !workspaceId || !user) return;

    const fileArray = Array.from(files);

    // 1. Insert rows with "uploading" status
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
        // Register in the ref so onClientUploadComplete can find the ID
        pendingUploadsRef.current.set(file.name, resource.id);
      } catch (err) {
        console.error("Failed to insert resource:", err);
      }
    }

    // Add to local state
    setResources((prev) => [...newResources, ...prev]);

    // 2. Start upload
    try {
      await startUpload(fileArray);
    } catch (err) {
      console.error("Upload failed:", err);
    }

    // Reset input
    e.target.value = "";
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Filter resources
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
        className="mx-6 mt-6 border-2 border-dashed bg-bg-card rounded-xl p-12 text-center"
        style={{ borderColor: `rgba(${auraRgb}, 0.3)` }}
      >
        <div
          className="p-4 rounded-full mx-auto mb-4 w-fit"
          style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
        >
          <Upload className="w-8 h-8" style={{ color: auraHex }} />
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
          style={{ backgroundColor: auraHex, color: auraContrast }}
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
                ? { backgroundColor: auraHex, color: auraContrast }
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
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: auraHex }} />
        </div>
      ) : filtered.length > 0 ? (
        <div className="mx-6 mt-4 flex flex-col gap-3 pb-6">
          {filtered.map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              onDelete={handleDelete}
              auraRgb={auraRgb}
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

/* ─── Resource Item ─── */
function ResourceItem({
  resource,
  onDelete,
  auraRgb,
}: {
  resource: Resource;
  onDelete: (id: string) => void;
  auraRgb: string;
}) {
  const iconConfig: Record<
    ResourceType,
    { bg: string; icon: React.ElementType; color: string }
  > = {
    pdf: { bg: "bg-red-900/40", icon: FileText, color: "text-red-400" },
    ppt: {
      bg: "bg-orange-900/40",
      icon: Presentation,
      color: "text-orange-400",
    },
    image: {
      bg: "bg-purple-900/40",
      icon: ImageIcon,
      color: "text-purple-400",
    },
    audio: { bg: "bg-blue-900/40", icon: Music, color: "text-blue-400" },
    youtube: { bg: "bg-red-900/40", icon: FileText, color: "text-red-400" },
  };

  const statusConfig: Record<
    ResourceStatus,
    { bg: string; color: string; label: string; pulse: boolean }
  > = {
    uploading: {
      bg: "bg-yellow-900/40",
      color: "text-yellow-400",
      label: "Uploading",
      pulse: true,
    },
    indexing: {
      bg: "bg-purple-900/40",
      color: "text-purple-400",
      label: "Indexing",
      pulse: true,
    },
    processing: {
      bg: "bg-blue-900/40",
      color: "text-[#507DBC]",
      label: "Processing",
      pulse: true,
    },
    ready: {
      bg: "bg-green-900/40",
      color: "text-green-400",
      label: "Ready",
      pulse: false,
    },
    failed: {
      bg: "bg-red-900/40",
      color: "text-red-400",
      label: "Failed",
      pulse: false,
    },
  };

  const { bg, icon: Icon, color } = iconConfig[resource.type] ?? iconConfig.pdf;
  const status = statusConfig[resource.status] ?? statusConfig.processing;

  return (
    <div
      className="bg-bg-card rounded-xl border px-4 py-3 flex items-center gap-4 group"
      style={{ borderColor: `rgba(${auraRgb}, 0.2)` }}
    >
      {/* File icon */}
      <div className={`${bg} rounded-lg p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">
          {resource.name}
        </p>
        <p className="text-text-muted text-xs mt-0.5">
          {formatBytes(resource.size)} &middot;{" "}
          {timeAgo(new Date(resource.created_at))}
        </p>
      </div>

      {/* Status badge */}
      <span
        className={`${status.bg} ${status.color} rounded-full px-3 py-1 text-xs font-medium shrink-0 ${
          status.pulse ? "animate-pulse" : ""
        }`}
      >
        {status.label}
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(resource.id)}
        className="text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all shrink-0"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Placeholder Views ─── */
function HomeView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
      <Sparkles className="w-12 h-12" />
      <h2 className="text-text-primary text-xl font-semibold">Home</h2>
      <p className="text-sm">Your workspace overview will appear here.</p>
    </div>
  );
}

function ChattieView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
      <MessageCircle className="w-12 h-12" />
      <h2 className="text-text-primary text-xl font-semibold">Chattie</h2>
      <p className="text-sm">AI chat assistant coming soon.</p>
    </div>
  );
}

function StudyRoomView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
      <Layers className="w-12 h-12" />
      <h2 className="text-text-primary text-xl font-semibold">Study Room</h2>
      <p className="text-sm">Collaborative study tools coming soon.</p>
    </div>
  );
}

function QuizView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
      <ClipboardList className="w-12 h-12" />
      <h2 className="text-text-primary text-xl font-semibold">Quiz</h2>
      <p className="text-sm">AI-generated quizzes coming soon.</p>
    </div>
  );
}
