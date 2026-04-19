import {
  Sparkles,
  FileText,
  Layers,
  BrainCircuit,
  Users,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceHomeProps {
  workspaceName: string;
  onNavigate: (nav: string) => void;
}

const aiTools = [
  {
    icon: FileText,
    title: "Summarization",
    description: "Generate concise summaries from your uploaded resources",
    nav: "summarization",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description: "Create AI-powered flashcards for quick revision",
    nav: "flashcards",
  },
  {
    icon: BrainCircuit,
    title: "Quiz Generator",
    description: "Test your knowledge with AI-generated quizzes",
    nav: "quiz",
  },
  {
    icon: Users,
    title: "Study Room",
    description: "Collaborate with peers in real-time quiz sessions",
    nav: "studyroom",
  },
];

export default function WorkspaceHome({
  workspaceName,
  onNavigate,
}: WorkspaceHomeProps) {
  return (
    <div className="p-6">
      {/* Welcome Banner */}
      <div
        className="relative border border-fade-border rounded-xl p-6 flex items-center justify-between overflow-hidden bg-bg-card"
      >
        <div>
          <h1 className="text-text-primary font-bold text-2xl">
            Welcome back to {workspaceName}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Pick up where you left off
          </p>
        </div>

        {/* Decorated icon container */}
        <div
          className="rounded-xl p-3 border border-fade-border shrink-0"
          style={{ backgroundColor: "rgba(80, 125, 188, 0.1)" }}
        >
          <Sparkles className="w-8 h-8" style={{ color: "var(--color-blue-accent)" }} />
        </div>
      </div>

      {/* AI Tools label — pill */}
      <div className="mt-8 mb-4">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold tracking-widest uppercase"
          style={{
            backgroundColor: "rgba(80, 125, 188, 0.1)",
            borderColor: "rgba(80, 125, 188, 0.2)",
            color: "var(--color-blue-accent)",
          }}
        >
          AI Tools
        </span>
      </div>

      {/* AI Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {aiTools.map((tool) => (
          <button
            key={tool.nav}
            onClick={() => onNavigate(tool.nav)}
            className="group text-left"
          >
            <div
              className="relative bg-[rgba(255,255,255,0.04)] backdrop-blur-md rounded-xl p-5 overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all duration-300 h-full flex flex-col justify-between hover:border-white/20 hover:bg-white/3"
            >
              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 border border-fade-border"
                  style={{ backgroundColor: "rgba(80, 125, 188, 0.08)" }}
                >
                  <tool.icon className="w-5 h-5" style={{ color: "var(--color-blue-accent)" }} />
                </div>
                <h3 className="text-text-primary font-semibold tracking-wide text-base mb-1">
                  {tool.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="flex justify-end mt-4 relative z-10">
                <ArrowRight className="text-text-muted w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Tip Banner */}
      <div
        className="border border-fade-border border-l-4 rounded-xl p-5 mt-6 flex items-center justify-between"
        style={{
          backgroundColor: "rgba(80, 125, 188, 0.05)",
          borderLeftColor: "var(--color-blue-accent)",
        }}
      >
        <div className="flex items-center gap-3">
          <Lightbulb className="w-5 h-5 shrink-0" style={{ color: "var(--color-blue-accent)" }} />
          <p className="text-text-secondary text-sm">
            Upload your resources first to unlock all AI features
          </p>
        </div>
        <Button
          className="shrink-0 font-medium rounded-lg px-4 py-2 transition-all duration-300"
          style={{ backgroundColor: "var(--color-blue-accent)", color: "#ffffff", border: "none" }}
          onClick={() => onNavigate("resources")}
        >
          Go to Resources
        </Button>
      </div>
    </div>
  );
}
