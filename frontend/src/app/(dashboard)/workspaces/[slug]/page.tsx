"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

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

export default function WorkspacePage() {
  const [activeNav, setActiveNav] = useState<NavItem>("resources");
  const [activeTab, setActiveTab] = useState<TabItem>("all");

  return (
    <div className="flex min-h-screen bg-main">
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
                        ? "bg-bg-card text-blue-accent rounded-xl p-2"
                        : "text-text-muted p-2 hover:text-blue-accent transition-colors"
                    }
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
                <button className="text-text-muted p-2 hover:text-blue-accent transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
            <div className="bg-blue-accent w-8 h-8 rounded-full" />
          </div>
        </aside>
      </TooltipProvider>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="w-full bg-main border-b border-fade-border px-6 py-4 flex items-center">
          {/* Left */}
          <div>
            <h1 className="text-text-primary font-bold text-lg">Full Stack</h1>
            <p className="text-text-muted text-sm">Resource Management</p>
          </div>

          {/* Right search */}
          <div className="relative w-96 ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search Projects"
              className="w-full bg-bg-card border border-fade-border rounded-lg pl-10 pr-4 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-accent"
            />
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto">
          {activeNav === "resources" && (
            <ResourcesView activeTab={activeTab} setActiveTab={setActiveTab} />
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
}: {
  activeTab: TabItem;
  setActiveTab: (tab: TabItem) => void;
}) {
  return (
    <>
      {/* Upload Card */}
      <div className="mx-6 mt-6 border-2 border-dashed border-fade-border bg-bg-card rounded-xl p-12 text-center">
        <div className="bg-fade-border p-4 rounded-full mx-auto mb-4 w-fit">
          <Upload className="w-8 h-8 text-blue-accent" />
        </div>
        <h2 className="text-text-primary font-bold text-xl">
          Upload Academic Resources
        </h2>
        <p className="text-text-muted text-sm mt-2">
          Drag and drop PDFs, PPTs, or paste YouTube links to start AI
          processing.
        </p>
        <Button className="bg-blue-accent text-text-primary rounded-lg px-8 py-2 mt-6 mx-auto block hover:bg-blue-accent/90">
          Select Files
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
                ? "bg-blue-accent text-text-primary rounded-full px-4 py-1 text-sm"
                : "text-text-muted px-4 py-1 text-sm hover:text-text-primary transition-colors"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center mt-20">
        <h3 className="text-text-primary font-semibold text-xl">
          Your resources are empty
        </h3>
        <p className="text-text-muted text-sm mt-2">Upload resources first</p>
      </div>
    </>
  );
}

/* ─── Home View ─── */
function HomeView() {
  return (
    <>
      <h2 className="text-text-primary font-bold text-2xl mx-6 mt-6">
        Dashboard Home
      </h2>
      <div className="grid grid-cols-2 gap-4 mx-6 mt-4">
        {/* Generate Summary Card */}
        <div className="bg-bg-card border border-fade-border rounded-xl p-6">
          <Sparkles className="w-8 h-8 text-blue-accent" />
          <h3 className="text-text-primary font-semibold text-lg mt-3">
            Generate Summary
          </h3>
          <p className="text-text-muted text-sm mt-1">
            Summarize your uploaded resources instantly.
          </p>
          <Button className="bg-blue-accent text-text-primary mt-4 rounded-lg px-4 py-2 hover:bg-blue-accent/90">
            Generate
          </Button>
        </div>

        {/* Generate Flashcards Card */}
        <div className="bg-bg-card border border-fade-border rounded-xl p-6">
          <Layers className="w-8 h-8 text-blue-accent" />
          <h3 className="text-text-primary font-semibold text-lg mt-3">
            Generate Flashcards
          </h3>
          <p className="text-text-muted text-sm mt-1">
            Create flashcards from your study material.
          </p>
          <Button className="bg-blue-accent text-text-primary mt-4 rounded-lg px-4 py-2 hover:bg-blue-accent/90">
            Generate
          </Button>
        </div>
      </div>
    </>
  );
}

/* ─── Chattie View ─── */
function ChattieView() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
      <MessageCircle className="w-12 h-12 text-blue-accent" />
      <h2 className="text-text-primary font-bold text-xl mt-4">
        Chattie - AI Chatbot
      </h2>
      <p className="text-text-muted text-sm mt-2">
        Your AI-powered study assistant will appear here.
      </p>
    </div>
  );
}

/* ─── Study Room View ─── */
function StudyRoomView() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
      <Brain className="w-12 h-12 text-blue-accent" />
      <h2 className="text-text-primary font-bold text-xl mt-4">Study Room</h2>
      <p className="text-text-muted text-sm mt-2">
        Collaborative study sessions will appear here.
      </p>
    </div>
  );
}

/* ─── Quiz View ─── */
function QuizView() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
      <ClipboardList className="w-12 h-12 text-blue-accent" />
      <h2 className="text-text-primary font-bold text-xl mt-4">Quiz</h2>
      <p className="text-text-muted text-sm mt-2">
        AI-generated quizzes will appear here.
      </p>
    </div>
  );
}
