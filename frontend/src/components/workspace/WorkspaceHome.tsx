import Link from "next/link";
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
  workspaceId: string;
  workspaceName: string;
  auraHex: string;
  auraRgb: string;
}

const aiTools = [
  {
    icon: FileText,
    title: "Summarization",
    description: "Generate concise summaries from your uploaded resources",
    path: "summarization",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description: "Create AI-powered flashcards for quick revision",
    path: "flashcards",
  },
  {
    icon: BrainCircuit,
    title: "Quiz Generator",
    description: "Test your knowledge with AI-generated quizzes",
    path: "quiz",
  },
  {
    icon: Users,
    title: "Study Room",
    description: "Collaborate with peers in real-time quiz sessions",
    path: "study-room",
  },
];

export default function WorkspaceHome({
  workspaceId,
  workspaceName,
  auraHex,
  auraRgb,
}: WorkspaceHomeProps) {
  return (
    <div className="p-6">
      {/* Welcome Banner */}
      <div
        className="border border-fade-border rounded-xl p-6 flex items-center justify-between"
        style={{ background: `linear-gradient(to right, var(--color-bg-card), rgba(${auraRgb}, 0.05))` }}
      >
        <div>
          <h1 className="text-text-primary text-2xl font-semibold">
            Welcome back to {workspaceName}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Pick up where you left off
          </p>
        </div>
        <Sparkles className="w-16 h-16" style={{ color: `rgba(${auraRgb}, 0.2)` }} />
      </div>

      {/* AI Feature Cards Grid */}
      <p className="text-text-muted text-xs uppercase tracking-widest font-medium mt-8 mb-4">
        AI Tools
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {aiTools.map((tool) => (
          <Link
            key={tool.path}
            href={`/dashboard/${workspaceId}/${tool.path}`}
            className="group"
          >
            <div
              className="bg-bg-card border border-fade-border rounded-xl p-5 hover:scale-[1.02] transition-all duration-200 h-full flex flex-col justify-between"
              style={{ ["--hover-border" as string]: `rgba(${auraRgb}, 0.5)` }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.5)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
            >
              <div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `rgba(${auraRgb}, 0.1)` }}
                >
                  <tool.icon className="w-5 h-5" style={{ color: auraHex }} />
                </div>
                <h3 className="text-text-primary font-medium text-base mb-1">
                  {tool.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {tool.description}
                </p>
              </div>
              <div className="flex justify-end mt-4">
                <ArrowRight className="text-text-muted w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Tip Banner */}
      <div
        className="border border-fade-border border-l-2 rounded-xl p-5 mt-6 flex items-center justify-between"
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
          variant="outline"
          className="shrink-0"
          style={{
            borderColor: `rgba(${auraRgb}, 0.5)`,
            color: auraHex,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.1)`; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
          asChild
        >
          <Link href={`/dashboard/${workspaceId}/resources`}>
            Go to Resources
          </Link>
        </Button>
      </div>
    </div>
  );
}
