"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CreateWorkspaceModal from "@/components/workspace-hub/CreateWorkspaceModal";
import DailyBriefing from "@/components/workspace-hub/DailyBriefing";
import StudyInvites from "@/components/workspace-hub/StudyInvites";
import UpcomingActivities from "@/components/workspace-hub/UpcomingActivities";
import WorkspaceGrid from "@/components/workspace-hub/WorkspaceGrid";
import { workspaceService } from "@/lib/services/workspace.service";
import type { Activity } from "@/types/activity";
import type { Invite } from "@/types/invite";
import type { Workspace } from "@/types/workspace";

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dailyBriefing, setDailyBriefing] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [workspaceList, inviteList, activityList, briefing] =
        await Promise.all([
          workspaceService.getWorkspaces(),
          workspaceService.getInvites(),
          workspaceService.getActivities(),
          workspaceService.getDailyBriefing(),
        ]);

      setWorkspaces(workspaceList);
      setInvites(inviteList);
      setActivities(activityList);
      setDailyBriefing(briefing);
    };

    void loadData();
  }, []);

  const filteredWorkspaces = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return workspaces;
    }

    return workspaces.filter((workspace) =>
      [workspace.name, workspace.description]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [searchQuery, workspaces]);

  const handleCreate = (workspace: Workspace) => {
    setWorkspaces((current) => [workspace, ...current]);
  };

  const handleWorkspaceOpen = (workspaceId: string) => {
    router.push(`/${workspaceId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white md:px-6">
      <div className="grid w-full gap-10 lg:grid-cols-[1.50fr_0.6fr]">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                  Workspace Hub
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                  Your AI-powered learning space
                </h1>
              </div>
              <div className="flex w-full max-w-sm items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-sm text-white/40">Search</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search projects"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-linear-to-br from-slate-900 via-slate-900/60 to-slate-950 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-white/70">Hello, Alice</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    Your friend has a new quiz waiting.
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Stay ahead with the latest AI-guided review prompts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="rounded-xl bg-blue-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  Create workspace
                </button>
              </div>
            </div>
          </header>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Workspaces</h2>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
              >
                View all
              </button>
            </div>
            <WorkspaceGrid
              workspaces={filteredWorkspaces}
              onOpenCreate={() => setIsModalOpen(true)}
              onSelectWorkspace={handleWorkspaceOpen}
            />
          </section>
        </div>

        <aside className="space-y-6">
          <StudyInvites invites={invites} />
          <UpcomingActivities activities={activities} />
          <DailyBriefing highlights={dailyBriefing} />
        </aside>
      </div>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
