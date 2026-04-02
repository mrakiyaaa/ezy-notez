"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Brain,
  ClipboardList,
  Settings,
  Search,
  Layers,
  ArrowLeft,
  AlignLeft,
  WalletCards,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WorkspaceHome from "@/components/workspace/WorkspaceHome";
import Chattie from "@/components/workspace/Chattie";
import ResourcesView from "@/components/workspace/ResourcesView";
import SummarizationView from "@/components/workspace/SummarizationView";
import FlashcardsView from "@/components/workspace/FlashcardsView";
import type { TabItem } from "@/components/workspace/ResourcesView";
import { hexToRgb, getContrastColor } from "@/lib/utils";
import { getWorkspaceBySlug } from "@/services/resource.service";
import type { WorkspaceInfo } from "@/types/resource";

type NavItem = "home" | "resources" | "chattie" | "summarization" | "flashcards" | "studyroom" | "quiz";

const navItems: { id: NavItem; icon: React.ElementType; label: string }[] = [
  { id: "home", icon: LayoutDashboard, label: "Home" },
  { id: "resources", icon: BookOpen, label: "Resources" },
  { id: "chattie", icon: MessageCircle, label: "Chattie" },
  { id: "summarization", icon: AlignLeft, label: "Summarization" },
  { id: "flashcards", icon: WalletCards, label: "Flashcards" },
  { id: "studyroom", icon: Brain, label: "Study Room" },
  { id: "quiz", icon: ClipboardList, label: "Quiz" },
];

/** View-name → subtitle mapping for the header. */
const navSubtitles: Record<NavItem, string> = {
  home: "Overview",
  resources: "Resource Management",
  chattie: "AI Chat",
  summarization: "AI Summarization",
  flashcards: "Flashcards",
  studyroom: "Study Room",
  quiz: "Quizzes",
};

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("home");
  const [activeTab, setActiveTab] = useState<TabItem>("all");
  const [cachedAura, setCachedAura] = useState<string | null>(null);

  // Read cached aura from localStorage before first paint (SSR-safe)
  useLayoutEffect(() => {
    if (!slug) return;
    try {
      const cached = localStorage.getItem(`workspace-aura-slug-${slug}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cached) setCachedAura(cached);
    } catch { /* */ }
  }, [slug]);

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
              <h1 className="text-text-primary font-semibold text-lg">
                {workspace?.name ?? "Loading…"}
              </h1>
              <span
                className="text-xs rounded-full px-2 py-0.5 mt-1 inline-block"
                style={{
                  backgroundColor: `rgba(${auraRgb}, 0.1)`,
                  color: auraHex,
                }}
              >
                {navSubtitles[activeNav]}
              </span>
            </div>
          </div>

          {/* Right search */}
          <div className="relative w-96 ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search Projects"
              className="w-full bg-bg-card border border-fade-border rounded-lg pl-10 pr-4 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = auraHex;
                e.currentTarget.style.boxShadow = `0 0 12px rgba(${auraRgb}, 0.15)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.boxShadow = "";
              }}
            />
          </div>
        </header>

        {/* View Content */}
        <main className={`flex-1 ${activeNav === "chattie" ? "overflow-hidden" : "overflow-y-auto"}`}>
          {activeNav === "resources" && (
            <ResourcesView
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              auraHex={auraHex}
              auraRgb={auraRgb}
              auraContrast={auraContrast}
            />
          )}
          {activeNav === "home" && workspace && (
            <WorkspaceHome
              workspaceName={workspace.name}
              auraHex={auraHex}
              auraRgb={auraRgb}
              onNavigate={(nav) => setActiveNav(nav as NavItem)}
            />
          )}
          {activeNav === "chattie" && workspace && (
            <Chattie
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              auraHex={auraHex}
              auraRgb={auraRgb}
            />
          )}
          {activeNav === "summarization" && workspace && (
            <SummarizationView
              workspaceId={workspace.id}
              auraHex={auraHex}
              auraRgb={auraRgb}
              auraContrast={auraContrast}
            />
          )}
          {activeNav === "flashcards" && workspace && (
            <FlashcardsView
              workspaceId={workspace.id}
              auraHex={auraHex}
              auraRgb={auraRgb}
              auraContrast={auraContrast}
            />
          )}
          {activeNav === "studyroom" && <StudyRoomView />}
          {activeNav === "quiz" && <QuizView />}
        </main>
      </div>
    </div>
  );
}

/* ─── Placeholder Views ─── */


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
