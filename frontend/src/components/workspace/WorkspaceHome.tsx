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
  auraHex: string;
  auraRgb: string;
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
  auraHex,
  auraRgb,
  onNavigate,
}: WorkspaceHomeProps) {
  return (
    <div className="p-6">
      <style>{`
        @keyframes ws-shimmer-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .ws-shimmer { animation: ws-shimmer-sweep 2.8s ease-in-out infinite; }
      `}</style>

      {/* Welcome Banner */}
      <div
        className="relative border border-fade-border rounded-xl p-6 flex items-center justify-between overflow-hidden"
        style={{
          background: `linear-gradient(to right, var(--color-bg-card), rgba(${auraRgb}, 0.05))`,
          borderTopColor: auraHex,
          borderTopWidth: "2px",
        }}
      >
        {/* Animated shimmer line along top edge */}
        <div className="absolute top-0 left-0 right-0 h-px overflow-hidden pointer-events-none">
          <div
            className="ws-shimmer absolute inset-y-0 w-1/3"
            style={{ background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.7), transparent)` }}
          />
        </div>

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
          className="rounded-xl p-3 border shrink-0"
          style={{
            backgroundColor: `rgba(${auraRgb}, 0.1)`,
            borderColor: `rgba(${auraRgb}, 0.2)`,
          }}
        >
          <Sparkles className="w-8 h-8" style={{ color: auraHex }} />
        </div>
      </div>

      {/* AI Tools label — pill */}
      <div className="mt-8 mb-4">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold tracking-widest uppercase"
          style={{
            backgroundColor: `rgba(${auraRgb}, 0.1)`,
            borderColor: `rgba(${auraRgb}, 0.2)`,
            color: auraHex,
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
              className="relative bg-bg-card rounded-xl p-5 overflow-hidden border transition-all duration-300 h-full flex flex-col justify-between"
              style={{ borderColor: `rgba(${auraRgb}, 0.2)` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.6)`;
                e.currentTarget.style.boxShadow = `0 0 24px rgba(${auraRgb}, 0.15)`;
                const dot = e.currentTarget.querySelector<HTMLElement>("[data-corner-dot]");
                if (dot) dot.style.backgroundColor = auraHex;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.2)`;
                e.currentTarget.style.boxShadow = "";
                const dot = e.currentTarget.querySelector<HTMLElement>("[data-corner-dot]");
                if (dot) dot.style.backgroundColor = `rgba(${auraRgb}, 0.4)`;
              }}
            >
              {/* Radial gradient overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top, rgba(${auraRgb}, 0.06), transparent 70%)` }}
              />

              {/* Top-left corner dot */}
              <div
                data-corner-dot
                className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full transition-colors duration-300 pointer-events-none"
                style={{ backgroundColor: `rgba(${auraRgb}, 0.4)` }}
              />

              {/* Top-right + crosshair */}
              <div className="absolute top-3 right-3 w-5 h-5 pointer-events-none">
                <span className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundColor: `rgba(${auraRgb}, 0.25)` }} />
                <span className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: `rgba(${auraRgb}, 0.25)` }} />
              </div>

              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 border transition-colors duration-300"
                  style={{
                    backgroundColor: `rgba(${auraRgb}, 0.1)`,
                    borderColor: `rgba(${auraRgb}, 0.2)`,
                  }}
                >
                  <tool.icon className="w-5 h-5" style={{ color: auraHex }} />
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

              {/* Bottom accent gradient bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.4), transparent)` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Quick Tip Banner */}
      <div
        className="border border-fade-border border-l-4 rounded-xl p-5 mt-6 flex items-center justify-between"
        style={{
          backgroundColor: `rgba(${auraRgb}, 0.05)`,
          borderLeftColor: auraHex,
        }}
      >
        <div className="flex items-center gap-3">
          <Lightbulb className="w-5 h-5 shrink-0" style={{ color: auraHex }} />
          <p className="text-text-secondary text-sm">
            Upload your resources first to unlock all AI features
          </p>
        </div>
        <Button
          className="shrink-0 font-medium rounded-lg px-4 py-2 transition-all duration-300"
          style={{ backgroundColor: auraHex, color: "#ffffff", border: "none" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 20px rgba(${auraRgb}, 0.4)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "";
          }}
          onClick={() => onNavigate("resources")}
        >
          Go to Resources
        </Button>
      </div>
    </div>
  );
}
