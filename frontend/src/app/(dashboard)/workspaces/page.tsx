"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateWorkspaceModal from "@/components/workspace/CreateWorkspaceModal";
import CollapsibleSidebar from "@/components/dashboard/CollapsibleSidebar";
import WorkspaceGrid from "@/components/dashboard/WorkspaceGrid";
import { getWorkspacesApi } from "@/api/workspace.api";
import Grainient from "@/components/ui/Grainient";
import {
  getPendingInvites,
  acceptInvite,
  dismissInvite,
} from "@/services/studyRoom.service";
import { getHubAnalytics } from "@/services/analytics.service";
import { supabase, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { Activity } from "@/types/activity";
import type { PendingInvite } from "@/types/studyRoom";
import type { Workspace } from "@/types/workspace";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [dailyBriefing, setDailyBriefing] = useState<string[]>([]);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadWorkspaces = async () => {
      try {
        const workspaceList = await getWorkspacesApi();
        if (mounted) setWorkspaces(workspaceList);
      } catch (error) {
        console.error("Failed to load workspaces:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const loadInvites = async () => {
      try {
        const inviteList = await getPendingInvites();
        if (mounted) setInvites(inviteList);
      } catch (error) {
        console.error("Failed to load pending invites:", error);
      } finally {
        if (mounted) setInvitesLoading(false);
      }
    };

    const loadAnalytics = async () => {
      try {
        const { activities: activityList, briefing } = await getHubAnalytics();
        if (mounted) {
          setActivities(activityList);
          setDailyBriefing(briefing);
        }
      } catch (error) {
        console.error("Failed to load hub analytics:", error);
      } finally {
        if (mounted) {
          setActivitiesLoading(false);
          setBriefingLoading(false);
        }
      }
    };

    void loadWorkspaces();
    void loadInvites();
    void loadAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

  // Realtime: refetch pending invites when study_room_invites changes for this user.
  // The schema keys invites by email (no invitee_id column), so we filter by email.
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refetchInvites = async () => {
      try {
        const inviteList = await getPendingInvites();
        if (mounted) setInvites(inviteList);
      } catch (err) {
        console.error("[Hub] Failed to refetch pending invites:", err);
      }
    };

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email || !mounted) return;

      await ensureRealtimeAuth();
      if (!mounted) return;

      channel = supabase
        .channel(`hub-invites:${email}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "study_room_invites",
            filter: `email=eq.${email}`,
          },
          () => {
            void refetchInvites();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "study_room_invites",
            filter: `email=eq.${email}`,
          },
          () => {
            void refetchInvites();
          },
        )
        .subscribe((status) => {
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            console.warn(`[Hub] invites channel status: ${status}`);
          }
        });
    };

    void setup();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
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
    getWorkspacesApi()
      .then(setWorkspaces)
      .catch((error) => console.error("Failed to reload workspaces:", error));
    router.push(`/workspaces/${slug}`);
  };

  const handleWorkspaceOpen = (slug: string) => {
    router.push(`/workspaces/${slug}`);
  };

  const handleWorkspaceDeleted = (id: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  };

  const handleJoinInvite = useCallback(
    async (invite: PendingInvite) => {
      await acceptInvite(invite.token);
      setInvites((prev) => prev.filter((p) => p.inviteId !== invite.inviteId));
      router.push(`/study-rooms/${invite.roomId}/lobby`);
    },
    [router],
  );

  const handleDismissInvite = useCallback(async (inviteId: string) => {
    setInvites((prev) => prev.filter((p) => p.inviteId !== inviteId));
    try {
      await dismissInvite(inviteId);
    } catch (error) {
      console.error("Failed to dismiss invite:", error);
    }
  }, []);

  const handleJoinedByCode = useCallback(
    (roomId: string) => {
      router.push(`/study-rooms/${roomId}/lobby`);
    },
    [router],
  );

  return (
    <div className="h-screen overflow-hidden bg-main px-4 md:px-6 text-text-primary">
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
      <div className="relative z-10 h-full">
        <div className="flex h-full gap-10">
          <div className="flex-1 min-w-0 overflow-y-auto scrollbar-hidden py-10 flex flex-col gap-8">
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
                    className="w-full bg-[rgba(255,255,255,0.04)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-lg pl-10 pr-4 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-accent"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] backdrop-blur-md p-6 shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
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
                  onDeleteWorkspace={handleWorkspaceDeleted}
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

          <CollapsibleSidebar
            invites={invites}
            invitesLoading={invitesLoading}
            activities={activities}
            activitiesLoading={activitiesLoading}
            dailyBriefing={dailyBriefing}
            briefingLoading={briefingLoading}
            onJoinInvite={handleJoinInvite}
            onDismissInvite={handleDismissInvite}
            onJoinedByCode={handleJoinedByCode}
          />
        </div>

        <CreateWorkspaceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleWorkspaceCreated}
        />
      </div>
    </div>
  );
}
