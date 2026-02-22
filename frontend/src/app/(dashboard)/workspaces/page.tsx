"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateWorkspaceModal from "@/components/workspaces/CreateWorkspaceModal";
import DailyBriefing from "@/components/workspace-hub/DailyBriefing";
import StudyInvites from "@/components/workspace-hub/StudyInvites";
import UpcomingActivities from "@/components/workspace-hub/UpcomingActivities";
import WorkspaceGrid from "@/components/workspace-hub/WorkspaceGrid";
import { getWorkspacesApi } from "@/lib/api/workspace.api";
import { workspaceService } from "@/lib/services/workspace.service";
import type { Activity } from "@/types/activity";
import type { Invite } from "@/types/invite";
import type { Workspace } from "@/types/workspace";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dailyBriefing, setDailyBriefing] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [workspaceList, inviteList, activityList, briefing] =
          await Promise.all([
            getWorkspacesApi(),
            workspaceService.getInvites(),
            workspaceService.getActivities(),
            workspaceService.getDailyBriefing(),
          ]);

        setWorkspaces(workspaceList);
        setInvites(inviteList);
        setActivities(activityList);
        setDailyBriefing(briefing);
      } catch (error) {
        console.error("Failed to load workspaces:", error);
      } finally {
        setIsLoading(false);
      }
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

  const handleWorkspaceCreated = (slug: string) => {
    // Reload workspaces after creation
    getWorkspacesApi()
      .then(setWorkspaces)
      .catch((error) => console.error("Failed to reload workspaces:", error));
    
    // Navigate to the new workspace
    router.push(`/workspaces/${slug}`);
  };

  const handleWorkspaceOpen = (slug: string) => {
    router.push(`/workspaces/${slug}`);
  };

  return (
    <div className="min-h-screen bg-main px-4 py-10 text-text-white md:px-6">
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
                <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search workspaces"
                  className="w-full bg-bg-card border border-fade-border rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-accent"
                />
                </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-linear-to-br bg-bg-card from-slate-900 via-bg-card to-bg-card-slate-950 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-white/70">Welcome to your spaces</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    Create or join a workspace to get started.
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Organize your study materials with collaborative workspaces.
                  </p>
                </div>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-blue-accent hover:bg-blue-accent/90"
                >
                  Create workspace
                </Button>
              </div>
            </div>
          </header>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Your Workspaces {!isLoading && `(${filteredWorkspaces.length})`}
              </h2>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-white/50">Loading workspaces...</p>
              </div>
            ) : filteredWorkspaces.length > 0 ? (
              <WorkspaceGrid
                workspaces={filteredWorkspaces}
                onOpenCreate={() => setIsModalOpen(true)}
                onSelectWorkspace={handleWorkspaceOpen}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 py-12">
                <p className="text-center text-white/50">
                  {searchQuery ? "No workspaces found" : "No workspaces yet"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 bg-blue-accent hover:bg-blue-accent/90"
                  >
                    Create your first workspace
                  </Button>
                )}
              </div>
            )}
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
        onSuccess={handleWorkspaceCreated}
      />
    </div>
  );
}
