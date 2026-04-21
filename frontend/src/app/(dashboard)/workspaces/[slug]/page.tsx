"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Brain,
  ClipboardList,
  ArrowLeft,
  AlignLeft,
  WalletCards,
  Settings,
} from "lucide-react";
import { fadeSlideIn } from "@/lib/animations";
import { getWorkspacesApi } from "@/api/workspace.api";
import type { Workspace } from "@/types/workspace";
import WorkspaceHome from "@/components/workspace/WorkspaceHome";
import Chattie from "@/components/workspace/Chattie";
import ResourcesView from "@/components/workspace/ResourcesView";
import SummarizationView from "@/components/workspace/SummarizationView";
import FlashcardsView from "@/components/workspace/FlashcardsView";
import QuizView from "@/components/workspace/QuizView";
import QuizAttemptView from "@/components/workspace/QuizAttemptView";
import QuizResultsView from "@/components/workspace/QuizResultsView";
import StudyRoomView from "@/components/workspace/StudyRoomView";
import TeddyCompanion from "@/components/workspace/quiz/TeddyCompanion";
import type { TabItem } from "@/components/workspace/ResourcesView";
import Grainient from "@/components/ui/Grainient";
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
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>(() => {
    const tab = searchParams.get("tab");
    if (tab === "studyroom") return "studyroom";
    return "home";
  });
  const [activeTab, setActiveTab] = useState<TabItem>("all");
  const [cachedAura, setCachedAura] = useState<string | null>(null);

  // Workspace switcher state
  const [workspaceList, setWorkspaceList] = useState<Workspace[]>([]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isWorkspaceListLoading, setIsWorkspaceListLoading] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);

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

  // Close switcher on outside click / Escape
  useEffect(() => {
    if (!isSwitcherOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSwitcherOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isSwitcherOpen]);

  const handleSelectWorkspace = useCallback(
    (targetSlug: string) => {
      setIsSwitcherOpen(false);
      if (targetSlug === slug) return;
      router.push(`/workspaces/${targetSlug}`);
    },
    [router, slug],
  );

  const loadWorkspaceList = useCallback(async () => {
    if (workspaceList.length > 0 || isWorkspaceListLoading) return;
    setIsWorkspaceListLoading(true);
    try {
      const list = await getWorkspacesApi();
      setWorkspaceList(list);
    } catch (err) {
      console.error("[WorkspacePage] Failed to load workspaces:", err);
    } finally {
      setIsWorkspaceListLoading(false);
    }
  }, [workspaceList.length, isWorkspaceListLoading]);

  const toggleSwitcher = useCallback(() => {
    setIsSwitcherOpen((prev) => {
      const next = !prev;
      if (next) loadWorkspaceList();
      return next;
    });
  }, [loadWorkspaceList]);

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

  // Close profile popover on outside click / Escape
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
    <div className="flex flex-col h-screen bg-main overflow-hidden">
      <div className="fixed inset-0 z-0">
        <Grainient
          color1="#111721"
          color2="#1a2537"
          color3="#324765"
          timeSpeed={0.3}
          colorBalance={0.05}
          warpStrength={0.8}
          warpFrequency={4.0}
          warpSpeed={0.9}
          warpAmplitude={60.0}
          contrast={1.4}
          grainAmount={0}
          zoom={0.95}
        />
      </div>

      {/* Unified Topbar */}
      <header className="h-[56px] shrink-0 w-full px-6 flex items-center justify-between border-b border-white/8 bg-white/4 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25)] relative z-20">
        {/* Left Side */}
        <div className="flex items-center">
          <Link href="/">
            <Image src="/images/logo/logo.svg" alt="Ezy Notez" width={100} height={32} className="h-10 w-auto" />
          </Link>
          <div className="w-px h-5 bg-white/20 mx-4" />
          <button
            onClick={() => router.push("/workspaces")}
            className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center mr-3"
            aria-label="Back to workspaces"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-semibold text-white/90">
              {workspace?.name ?? "Loading…"}
            </span>
            <span className="text-white/30 text-[12px] mx-1">/</span>
            <span className="text-[12px] text-text-muted font-medium tracking-wide">
              {navSubtitles[activeNav]}
            </span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {activeNav === "quiz" && (
            <div className="shrink-0">
              <TeddyCompanion size={96} height={56} />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem("ezynotes:last-workspace-slug", slug);
              } catch { /* */ }
              router.push("/settings");
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 opacity-80" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-accent flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-white">
                  {initials || "U"}
                </span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden max-w-[120px]">
              <span className="text-sm font-medium text-text-primary truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[11px] text-white/50 truncate leading-tight">
                {displayEmail}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Workspace App Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10 w-full">
      {/* Left Sidebar */}
      <aside className="w-64 flex flex-col border-r border-white/8 bg-white/4 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25)] h-full shrink-0">
        {/* 2. Active workspace chip */}
        <div className="px-4 mt-6 shrink-0 relative" ref={switcherRef}>
          <div className="text-[10px] uppercase font-semibold text-text-muted mb-2 px-2">
            Active Workspace
          </div>
          <button
            type="button"
            onClick={toggleSwitcher}
            aria-haspopup="listbox"
            aria-expanded={isSwitcherOpen}
            className="flex items-center justify-between w-full px-3 py-2 bg-blue-accent/10 border border-blue-accent/30 rounded-lg cursor-pointer hover:bg-blue-accent/15 transition-colors"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: auraHex }}
              />
              <span className="text-sm font-medium text-text-secondary truncate">
                {workspace?.name ?? "Loading..."}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${
                isSwitcherOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isSwitcherOpen && (
            <div
              role="listbox"
              className="absolute left-4 right-4 mt-2 z-50 bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-lg shadow-xl overflow-hidden"
            >
              <div className="max-h-72 overflow-y-auto py-1">
                {isWorkspaceListLoading && workspaceList.length === 0 && (
                  <div className="px-3 py-3 text-xs text-text-muted">
                    Loading workspaces…
                  </div>
                )}
                {!isWorkspaceListLoading && workspaceList.length === 0 && (
                  <div className="px-3 py-3 text-xs text-text-muted">
                    No workspaces found.
                  </div>
                )}
                {workspaceList.map((w) => {
                  const isActive = w.slug === slug;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelectWorkspace(w.slug)}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-blue-accent/15 text-text-secondary"
                          : "text-text-muted hover:bg-white/5 hover:text-text-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: w.aura || "#507DBC" }}
                        />
                        <span className="text-sm font-medium truncate">
                          {w.name}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-wide text-blue-accent shrink-0 ml-2">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSwitcherOpen(false);
                  router.push("/workspaces");
                }}
                className="w-full px-3 py-2 text-xs font-medium text-blue-accent border-t border-fade-border hover:bg-white/5 transition-colors text-left"
              >
                View all workspaces
              </button>
            </div>
          )}
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
                      : "text-text-muted hover:bg-white/4 hover:text-text-primary"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="workspace-nav-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4.5 bg-blue-accent rounded-r shadow-[0_0_12px_rgba(59,130,246,0.7)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-3.75 h-3.75 ${
                      isActive ? "opacity-100" : "opacity-60"
                    }`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* View Content */}
        <main className={`flex-1 min-h-0 ${activeNav === "chattie" ? "overflow-hidden" : "overflow-y-auto"}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={
                activeNav === "quiz"
                  ? `quiz-${quizState.mode}`
                  : activeNav
              }
              variants={fadeSlideIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
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
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      </div>
    </div>
  );
}

