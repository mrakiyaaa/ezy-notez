"use client";

import { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { PendingInvite } from "@/types/studyRoom";

interface StudyRoomInvitesPanelProps {
  invites: PendingInvite[];
  isLoading?: boolean;
  onJoin: (invite: PendingInvite) => Promise<void>;
  onDismiss: (inviteId: string) => Promise<void>;
}

function HostAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-blue-accent/20 border border-blue-accent/30 flex items-center justify-center">
      <span className="text-xs font-semibold text-blue-300">{initials || "?"}</span>
    </div>
  );
}

function InviteCard({
  invite,
  onJoin,
  onDismiss,
}: {
  invite: PendingInvite;
  onJoin: (invite: PendingInvite) => Promise<void>;
  onDismiss: (inviteId: string) => Promise<void>;
}) {
  const [isJoining, setIsJoining] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await onJoin(invite);
    } finally {
      setIsJoining(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss(invite.inviteId);
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 transition-all duration-200 hover:border-blue-accent/30 hover:shadow-[0_0_16px_rgba(80,125,188,0.12)]">
      <div className="flex items-center gap-3">
        <HostAvatar name={invite.hostName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-text-primary">
            <span className="font-medium">{invite.hostName}</span> invited you to{" "}
            <span className="font-medium">{invite.roomTitle}</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleJoin}
          disabled={isJoining || isDismissing}
          className="flex-1 rounded-lg bg-blue-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-accent/80 disabled:opacity-50"
        >
          {isJoining ? "Joining…" : "Join"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isDismissing || isJoining}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {isDismissing ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="w-40 h-40">
        <DotLottieReact
          src="https://lottie.host/741999bf-ab40-4c55-b13f-f2bbf685bcbd/QZEyuubGUd.lottie"
          loop
          autoplay
        />
      </div>
      <p className="mt-1 text-sm text-white/60">No invites right now.</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-slate-950/40 p-5 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/10" />
            <div className="h-3 w-40 rounded bg-white/10" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-7 flex-1 rounded-lg bg-white/10" />
            <div className="h-7 flex-1 rounded-lg bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudyRoomInvitesPanel({
  invites,
  isLoading = false,
  onJoin,
  onDismiss,
}: StudyRoomInvitesPanelProps) {
  return (
    <section>
      <div className="rounded-2xl border border-white/10 bg-bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">
            Study Room Invites
          </h3>
          {invites.length > 0 && (
            <span className="rounded-full bg-blue-accent/20 px-2 py-0.5 text-xs font-medium text-blue-300">
              {invites.length} pending
            </span>
          )}
        </div>
        <div className="mt-4">
          {isLoading ? (
            <LoadingState />
          ) : invites.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <InviteCard
                  key={invite.inviteId}
                  invite={invite}
                  onJoin={onJoin}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
