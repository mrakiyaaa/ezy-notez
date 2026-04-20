"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";
import StudyRoomInvitesPanel from "@/components/workspace/study-room/StudyRoomInvitesPanel";
import UpcomingActivities from "./UpcomingActivities";
import DailyBriefing from "./DailyBriefing";
import type { PendingInvite } from "@/types/studyRoom";
import type { Activity } from "@/types/activity";

const STORAGE_KEY = "workspace-hub-sidebar-collapsed";
const EXPANDED_WIDTH = 380;
const COLLAPSED_WIDTH = 36;

interface CollapsibleSidebarProps {
  invites: PendingInvite[];
  invitesLoading?: boolean;
  activities: Activity[];
  activitiesLoading?: boolean;
  dailyBriefing: string[];
  briefingLoading?: boolean;
  onJoinInvite: (invite: PendingInvite) => Promise<void>;
  onDismissInvite: (inviteId: string) => Promise<void>;
}

export default function CollapsibleSidebar({
  invites,
  invitesLoading = false,
  activities,
  activitiesLoading = false,
  dailyBriefing,
  briefingLoading = false,
  onJoinInvite,
  onDismissInvite,
}: CollapsibleSidebarProps) {
  const { user, profile } = useProfile();
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch { return false; }
  });

  const toggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { /* localStorage unavailable */ }
      return next;
    });
  };

  const pendingInvites = invites.length;
  const activeActivities = activities.filter((a) => a.status !== "done").length;
  const hasIndicators = pendingInvites > 0 || activeActivities > 0;

  return (
    <aside
      className="relative shrink-0 overflow-x-hidden overflow-y-auto scrollbar-hidden py-10"
      style={{
        width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        transition: "width 300ms ease-in-out",
      }}
    >
      {/* ── Toggle button ───────────────────────────────────────────────── */}
      <div
        className="flex items-center mb-3"
        style={{ justifyContent: isCollapsed ? "center" : "flex-end" }}
      >
        <button
          onClick={toggle}
          className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex items-center justify-center text-white/40 hover:text-text-primary transition-colors duration-150 shrink-0"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className="w-4 h-4"
            style={{
              transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 300ms ease-in-out",
            }}
          />
        </button>
      </div>

      {/* ── Collapsed: dot indicators for pending items ─────────────────── */}
      {isCollapsed && hasIndicators && (
        <div className="flex flex-col items-center gap-3 mt-1">
          {pendingInvites > 0 && (
            <span
              className="w-2 h-2 rounded-full bg-blue-accent"
              title={`${pendingInvites} pending invite${pendingInvites !== 1 ? "s" : ""}`}
            />
          )}
          {activeActivities > 0 && (
            <span
              className="w-2 h-2 rounded-full bg-amber-300"
              title={`${activeActivities} active activit${activeActivities !== 1 ? "ies" : "y"}`}
            />
          )}
        </div>
      )}

      {/* ── Full panel content ────────────────────────────────────────── */}
      <div
        className="space-y-6"
        style={{
          minWidth: EXPANDED_WIDTH,
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? "none" : "auto",
          transition: isCollapsed
            ? "opacity 100ms ease-out 0ms"
            : "opacity 200ms ease-in 150ms",
        }}
      >
        {user && profile && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white/10 flex items-center justify-center text-sm font-medium text-white/80">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" />
              ) : (
                (profile.full_name || "U")[0].toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-text-primary truncate">
                {profile.full_name}
              </span>
              <span className="text-xs text-white/50 truncate">
                {user.email}
              </span>
            </div>
          </div>
        )}

        <StudyRoomInvitesPanel
          invites={invites}
          isLoading={invitesLoading}
          onJoin={onJoinInvite}
          onDismiss={onDismissInvite}
        />
        <UpcomingActivities activities={activities} isLoading={activitiesLoading} />
        <DailyBriefing highlights={dailyBriefing} isLoading={briefingLoading} />
      </div>
    </aside>
  );
}
