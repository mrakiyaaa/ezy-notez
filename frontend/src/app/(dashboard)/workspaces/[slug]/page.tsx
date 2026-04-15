"use client";

import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Brain,
  ClipboardList,
  Search,
  ArrowLeft,
  AlignLeft,
  WalletCards,
} from "lucide-react";
import WorkspaceHome from "@/components/workspace/WorkspaceHome";
import Chattie from "@/components/workspace/Chattie";
import ResourcesView from "@/components/workspace/ResourcesView";
import SummarizationView from "@/components/workspace/SummarizationView";
import FlashcardsView from "@/components/workspace/FlashcardsView";
import QuizView from "@/components/workspace/QuizView";
import QuizAttemptView from "@/components/workspace/QuizAttemptView";
import QuizResultsView from "@/components/workspace/QuizResultsView";
import StudyRoomView from "@/components/workspace/StudyRoomView";
import type { TabItem } from "@/components/workspace/ResourcesView";
import AuraIndicator from "@/components/ui/AuraIndicator";
import { getWorkspaceBySlug } from "@/services/resource.service";
import type { WorkspaceInfo } from "@/types/resource";
import { useProfile } from "@/hooks/useProfile";
import { useMemo } from "react";
import { ChevronDown } from "lucide-react";

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

  // Quiz navigation state
  const [quizState, setQuizState] = useState<{
    mode: "list" | "attempt" | "results";
    quizId?: string;
    attemptId?: string;
  }>({ mode: "list" });

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

  const { profile, user } = useProfile();
  const displayName = profile?.full_name || "Student";
  const displayEmail = profile?.email || user?.email || "";
  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  }, [displayName]);

  // Switch nav and reset quiz state when navigating away
  const handleNavChange = useCallback((nav: NavItem) => {
    setActiveNav(nav);
    if (nav !== "quiz") {
      setQuizState({ mode: "list" });
    }
  }, []);

  // Quiz navigation handlers
  const handleQuizStartAttempt = useCallback((quizId: string) => {
    setQuizState({ mode: "attempt", quizId });
  }, []);

  const handleQuizViewResults = useCallback((quizId: string, attemptId: string) => {
    setQuizState({ mode: "results", quizId, attemptId });
  }, []);

  const handleQuizExitAttempt = useCallback(() => {
    setQuizState({ mode: "list" });
  }, []);

  const handleQuizComplete = useCallback((quizId: string, attemptId: string) => {
    setQuizState({ mode: "results", quizId, attemptId });
  }, []);

  const handleQuizRetake = useCallback((quizId: string) => {
    setQuizState({ mode: "attempt", quizId });
  }, []);

  const handleQuizGenerateNew = useCallback(() => {
    setQuizState({ mode: "list" });
  }, []);

  const handleQuizBack = useCallback(() => {
    setQuizState({ mode: "list" });
  }, []);

  // Keep auraHex for the AuraIndicator dot only
  const auraHex = workspace?.aura || cachedAura || "#507DBC";

  return (
    <div
      // Bound the shell to (viewport - dashboard header) so the inner <main>
      // becomes the scroll surface. This keeps the sidebar and workspace top
      // header fixed while only the main content area scrolls.
      // Offset matches the dashboard layout header (logo 60 + py-4 32 + border 1 = 93px).
      className="flex h-[calc(100vh-93px)] bg-main overflow-hidden"
    >
      {/* Left Sidebar */}
      <aside className="w-64 flex flex-col border-r border-fade-border bg-main h-full shrink-0">
        {/* 2. Active workspace chip */}
        <div className="px-4 mt-6 shrink-0">
          <div className="text-[10px] uppercase font-semibold text-text-muted mb-2 px-2">
            Active Workspace
          </div>
          <div className="flex items-center justify-between w-full px-3 py-2 bg-blue-accent/10 border border-blue-accent/30 rounded-lg cursor-pointer">
            <div className="flex items-center gap-2 overflow-hidden">
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: auraHex }} 
              />
              <span className="text-sm font-medium text-text-secondary truncate">
                {workspace?.name ?? "Loading..."}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
          </div>
        </div>

        {/* 3. Nav section */}
        <div className="px-4 mt-8 flex-1 overflow-y-auto">
          <div className="text-[10px] uppercase font-semibold text-text-muted mb-2 px-2">
            Navigation
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ id, icon: Icon, label }) => {
              const isActive = activeNav === id;
              return (
                <button
                  key={id}
                  onClick={() => handleNavChange(id)}
                  className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-accent/10 text-text-secondary"
                      : "text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-blue-accent rounded-r" />
                  )}
                  <Icon
                    className={`w-[15px] h-[15px] ${
                      isActive ? "opacity-100" : "opacity-60"
                    }`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 4. Footer */}
        <div className="p-4 border-t border-fade-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-accent flex items-center justify-center shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {initials || "U"}
                </span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-text-primary truncate">
                {displayName}
              </span>
              <span className="text-xs text-text-muted truncate">
                {displayEmail}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header
          className="w-full bg-main px-6 py-4 flex items-center border-b border-fade-border"
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
              <div className="flex items-center gap-2">
                <h1 className="text-text-primary font-semibold text-lg">
                  {workspace?.name ?? "Loading…"}
                </h1>
                <AuraIndicator hex={auraHex} />
              </div>
              <span className="text-xs text-text-muted mt-1 inline-block">
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
              className="w-full bg-bg-card border border-fade-border rounded-lg pl-10 pr-4 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-white/20"
            />
          </div>
        </header>

        {/* View Content */}
        <main className={`flex-1 ${activeNav === "chattie" ? "overflow-hidden" : "overflow-y-auto"}`}>
          {activeNav === "resources" && (
            <ResourcesView
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
          {activeNav === "home" && workspace && (
            <WorkspaceHome
              workspaceName={workspace.name}
              onNavigate={(nav) => setActiveNav(nav as NavItem)}
            />
          )}
          {activeNav === "chattie" && workspace && (
            <Chattie
              workspaceId={workspace.id}
              workspaceName={workspace.name}
            />
          )}
          {activeNav === "summarization" && workspace && (
            <SummarizationView
              workspaceId={workspace.id}
            />
          )}
          {activeNav === "flashcards" && workspace && (
            <FlashcardsView
              workspaceId={workspace.id}
            />
          )}
          {activeNav === "studyroom" && workspace && (
            <StudyRoomView workspaceId={workspace.id} />
          )}
          {activeNav === "quiz" && workspace && (
            <>
              {quizState.mode === "list" && (
                <QuizView
                  workspaceId={workspace.id}
                  onStartAttempt={handleQuizStartAttempt}
                  onViewResults={handleQuizViewResults}
                />
              )}
              {quizState.mode === "attempt" && quizState.quizId && (
                <QuizAttemptView
                  quizId={quizState.quizId}
                  onExit={handleQuizExitAttempt}
                  onComplete={handleQuizComplete}
                />
              )}
              {quizState.mode === "results" && quizState.quizId && quizState.attemptId && (
                <QuizResultsView
                  quizId={quizState.quizId}
                  attemptId={quizState.attemptId}
                  onRetake={handleQuizRetake}
                  onGenerateNew={handleQuizGenerateNew}
                  onBack={handleQuizBack}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

