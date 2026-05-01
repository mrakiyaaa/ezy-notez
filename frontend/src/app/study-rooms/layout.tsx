"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Grainient from "@/components/ui/Grainient";
import { getWorkspaceByIdApi } from "@/api/workspace.api";
import type { Workspace } from "@/types/workspace";

export default function StudyRoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const fromWorkspaceId = searchParams.get("from");

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromWorkspaceId) return;
    let mounted = true;
    getWorkspaceByIdApi(fromWorkspaceId)
      .then((ws) => { if (mounted) setWorkspace(ws); })
      .catch((err) => {
        if (mounted) {
          setWorkspaceError(
            err instanceof Error ? err.message : "Failed to load workspace",
          );
          setWorkspace(null);
        }
      });
    return () => { mounted = false; };
  }, [fromWorkspaceId]);

  const auraHex = workspace?.aura || "#507DBC";
  const backHref = workspace
    ? `/workspaces/${workspace.slug}`
    : "/workspaces";
  const backLabel = workspace
    ? `Back to ${workspace.name}`
    : "Back to Hub";

  return (
    <div className="flex flex-col h-screen bg-main overflow-hidden text-text-primary">
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

      <header className="h-[56px] shrink-0 w-full px-6 flex items-center justify-between border-b border-white/8 bg-white/4 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25)] relative z-20">
        <div className="flex items-center">
          <Link href="/">
            <Image
              src="/images/logo/logo.svg"
              alt="Ezy Notez"
              width={100}
              height={32}
              className="h-10 w-auto"
            />
          </Link>
          <div className="w-px h-5 bg-white/20 mx-4" />
          <Link
            href={backHref}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm"
            aria-label={backLabel}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {fromWorkspaceId && workspace && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-accent/10 border border-blue-accent/30">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: auraHex }}
              />
              <span className="text-sm font-medium text-text-secondary truncate max-w-[180px]">
                {workspace.name}
              </span>
            </div>
          )}
          {fromWorkspaceId && !workspace && !workspaceError && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/4 border border-fade-border">
              <div className="w-2 h-2 rounded-full bg-text-muted animate-pulse" />
              <span className="text-sm text-text-muted">Loading…</span>
            </div>
          )}
          <span className="text-text-muted text-[11px] uppercase tracking-widest hidden md:inline">
            Study Room
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto relative z-10">
        {children}
      </main>
    </div>
  );
}
