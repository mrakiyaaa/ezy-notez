"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWorkspaceBySlugApi } from "@/lib/api/workspace.api";
import { Workspace } from "@/types/workspace";

export default function WorkspacePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        setLoading(true);
        const data = await getWorkspaceBySlugApi(slug);
        setWorkspace(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load workspace";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      void loadWorkspace();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-white/50">Loading workspace...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error || "Workspace not found"}</p>
          <Link
            href="/workspaces"
            className="text-blue-500 hover:text-blue-400 underline"
          >
            Back to workspaces
          </Link>
        </div>
      </div>
    );
  }

  const auraColor = workspace.aura;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div
            className="h-16 rounded-lg mb-6"
            style={{ backgroundColor: auraColor }}
          />
          <div>
            <h1 className="text-4xl font-bold mb-2">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-white/70 max-w-2xl">{workspace.description}</p>
            )}
            <p className="text-sm text-white/50 mt-4">
              Created: {new Date(workspace.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Navigation Cards */}
          <NavigationCard
            title="Study Room"
            description="Collaborative learning space"
            href={`/workspaces/${slug}/study-room`}
            icon="🏫"
          />
          <NavigationCard
            title="Resources"
            description="Manage learning materials"
            href={`/workspaces/${slug}/resources`}
            icon="📚"
          />
          <NavigationCard
            title="Quiz"
            description="Generate & take quizzes"
            href={`/workspaces/${slug}/quiz`}
            icon="📝"
          />
          <NavigationCard
            title="Flashcards"
            description="Create & review flashcards"
            href={`/workspaces/${slug}/flashcards`}
            icon="🎯"
          />
        </div>

        {/* Demo Content Section */}
        <section className="rounded-lg border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold mb-4">Workspace Overview</h2>
          <div className="space-y-4 text-white/70">
            <p>
              Welcome to <strong>{workspace.name}</strong>! This is your dedicated
              learning space where you can:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Create and manage study materials</li>
              <li>Collaborate with others in real-time</li>
              <li>Generate AI-powered quizzes and flashcards</li>
              <li>Track your progress and learning goals</li>
              <li>Access all your resources in one place</li>
            </ul>
            <p className="mt-6">
              Use the navigation above to get started, or explore the sidebar for
              additional features and settings.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

interface NavigationCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
}

function NavigationCard({
  title,
  description,
  href,
  icon,
}: NavigationCardProps) {
  return (
    <a
      href={href}
      className="group rounded-lg border border-white/10 bg-white/5 p-6 transition hover:bg-white/10 hover:border-white/20"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-1 group-hover:text-blue-400 transition">
        {title}
      </h3>
      <p className="text-sm text-white/60">{description}</p>
    </a>
  );
}
