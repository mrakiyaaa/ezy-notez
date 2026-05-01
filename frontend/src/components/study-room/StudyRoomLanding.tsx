"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, KeyRound, X, Users, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type {
  RecentRoom,
  HostedRoom,
  StudyRoom,
  StudyRoomStats,
  PendingInvite,
} from "@/types/studyRoom";
import {
  getRecentRooms,
  getHostedRooms,
  getStudyRoomStats,
  getPendingInvites,
  acceptInvite,
  dismissInvite,
  deleteStudyRoom,
} from "@/services/studyRoom.service";
import { apiClient } from "@/api/axios-config";
import CreateRoomModal from "./CreateRoomModal";

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  completed: { label: "Completed", bg: "rgba(34,197,94,0.12)", text: "#22c55e" },
  waiting: { label: "Waiting", bg: "rgba(59,130,246,0.12)", text: "#3b82f6" },
  in_progress: { label: "In Progress", bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.waiting;
  return (
    <span
      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// ─── skeleton loaders ───────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-4 w-2/3 rounded bg-white/5" />
        <div className="h-4 w-16 rounded-full bg-white/5" />
      </div>
      <div className="h-3 w-1/2 rounded bg-white/5 mb-4" />
      <div className="border-t border-fade-border pt-3">
        <div className="h-3 w-24 rounded bg-white/5" />
      </div>
    </div>
  );
}

function SkeletonStatBar() {
  return (
    <div className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] px-4 py-3 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-4 w-12 rounded bg-white/5" />
        <div className="h-4 w-12 rounded bg-white/5" />
        <div className="h-4 w-12 rounded bg-white/5" />
      </div>
    </div>
  );
}

function SkeletonInvitePanel() {
  return (
    <div className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-4 animate-pulse">
      <div className="h-4 w-24 rounded bg-white/5 mb-4" />
      <div className="h-16 w-full rounded bg-white/5" />
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

interface StudyRoomLandingProps {
  workspaceId: string;
}

export default function StudyRoomLanding({ workspaceId }: StudyRoomLandingProps) {
  const router = useRouter();

  const fromQuery = `?from=${workspaceId}`;
  const goToLobby = useCallback(
    (roomId: string) => {
      router.push(`/study-rooms/${roomId}/lobby${fromQuery}`);
    },
    [router, fromQuery],
  );

  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [hostedRooms, setHostedRooms] = useState<HostedRoom[]>([]);
  const [stats, setStats] = useState<StudyRoomStats>({ hostedCount: 0, playedCount: 0, totalPoints: 0 });
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Join by code dialog state
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Delete confirmation dialog state
  const [roomToDelete, setRoomToDelete] = useState<HostedRoom | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [recent, hosted, st, pending] = await Promise.all([
        getRecentRooms(workspaceId),
        getHostedRooms(workspaceId),
        getStudyRoomStats(workspaceId),
        getPendingInvites(),
      ]);
      setRecentRooms(recent);
      setHostedRooms(hosted);
      setStats(st);
      setPendingInvites(pending);
    } catch (err) {
      console.error("[StudyRoomLanding] Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ?create=true auto-open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") setShowCreateModal(true);
    }
  }, []);

  const handleRoomCreated = (room: StudyRoom) => {
    setShowCreateModal(false);
    goToLobby(room.id);
  };

  const handleJoinByCode = async () => {
    const code = otpInput.trim();
    if (!code) return;
    if (!/^\d{6}$/.test(code)) {
      setJoinError("Please enter a valid 6-digit code");
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const response = await apiClient.post("/study-rooms/join-by-code", {
        otp_code: code,
      });
      const data = response.data.data as { room: StudyRoom };
      setShowJoinDialog(false);
      setOtpInput("");
      goToLobby(data.room.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join room";
      setJoinError(msg);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: PendingInvite) => {
    try {
      await acceptInvite(invite.token);
      setPendingInvites((prev) => prev.filter((p) => p.inviteId !== invite.inviteId));
      goToLobby(invite.roomId);
    } catch (err) {
      console.error("[StudyRoomLanding] accept invite failed:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteStudyRoom(roomToDelete.id);
      setHostedRooms((prev) => prev.filter((r) => r.id !== roomToDelete.id));
      setRecentRooms((prev) => prev.filter((r) => r.id !== roomToDelete.id));
      setStats((prev) => ({
        ...prev,
        hostedCount: Math.max(0, prev.hostedCount - 1),
      }));
      setRoomToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete room");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDismissInvite = async (inviteId: string) => {
    setPendingInvites((prev) => prev.filter((p) => p.inviteId !== inviteId));
    try {
      await dismissInvite(inviteId);
    } catch (err) {
      console.error("[StudyRoomLanding] dismiss invite failed:", err);
    }
  };

  const filteredInvites = pendingInvites.filter((p) => p.workspaceId === workspaceId);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid gap-8" style={{ gridTemplateColumns: "1fr 300px" }}>
        <div className="flex flex-col gap-8 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <PageHeader
              icon={<Users size={22} color="#507DBC" strokeWidth={1.8} fill="none" />}
              title="Study Room"
              description="Collaborate with friends in real-time quiz battles"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setShowJoinDialog(true); setJoinError(null); setOtpInput(""); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] text-text-secondary text-sm font-medium whitespace-nowrap transition-all duration-200 hover:bg-white/6"
              >
                <KeyRound className="w-4 h-4" />
                Join by Code
              </button>
              <PrimaryButton
                onClick={() => setShowCreateModal(true)}
                icon={Plus}
                label="Create Room"
              />
            </div>
          </div>

          {/* Recent Rooms */}
          <section>
            <h3 className="text-text-muted text-[11px] font-semibold uppercase tracking-widest mb-3">
              Recent Rooms
            </h3>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : recentRooms.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {recentRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-4 transition-all duration-200 hover:border-blue-accent/30"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-text-primary text-sm font-medium truncate flex-1">
                        {room.title}
                      </h4>
                      <StatusBadge status={room.status} />
                    </div>
                    <p className="text-text-muted text-[11px] mb-3">
                      {timeAgo(room.date)} · {room.total_questions} questions
                    </p>
                    <div className="flex items-center justify-between border-t border-fade-border pt-3">
                      <div className="flex items-center gap-1.5 text-text-muted">
                        <Users className="w-3 h-3" />
                        <span className="text-[11px]">{room.participant_count}</span>
                      </div>
                      {room.score !== undefined && room.total_questions > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-accent"
                              style={{ width: `${(room.score / room.total_questions) * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-text-secondary font-medium">
                            {room.score}/{room.total_questions}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/40 py-10 text-center">
                <p className="text-text-muted text-sm">No rooms yet</p>
              </div>
            )}
          </section>

          {/* My Hosted Rooms */}
          <section>
            <h3 className="text-text-muted text-[11px] font-semibold uppercase tracking-widest mb-3">
              My Hosted Rooms
            </h3>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : hostedRooms.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {hostedRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-4 transition-all duration-200 hover:border-blue-accent/30"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-text-primary text-sm font-medium truncate flex-1">
                        {room.title}
                      </h4>
                      <StatusBadge status={room.status} />
                    </div>
                    <p className="text-text-muted text-[11px] mb-3">
                      {timeAgo(room.date)} · Hosted
                    </p>
                    <div className="flex items-center justify-between border-t border-fade-border pt-3">
                      <div className="flex items-center gap-1.5 text-text-muted">
                        <Users className="w-3 h-3" />
                        <span className="text-[11px]">{room.participant_count} joined</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {room.status === "waiting" ? (
                          <button
                            onClick={() => goToLobby(room.id)}
                            className="px-3 py-1 rounded-md border border-blue-accent/40 text-blue-accent text-[11px] font-medium hover:bg-blue-accent/10 transition-colors"
                          >
                            Go to Lobby
                          </button>
                        ) : room.status === "in_progress" ? (
                          <button
                            onClick={() => goToLobby(room.id)}
                            className="px-3 py-1 rounded-md border border-blue-accent/40 text-blue-accent text-[11px] font-medium hover:bg-blue-accent/10 transition-colors"
                          >
                            Rejoin
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomToDelete(room);
                            setDeleteError(null);
                          }}
                          className="w-7 h-7 rounded-md border-white/[0.08] text-text-muted hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                          aria-label="Delete room"
                          title="Delete room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/40 py-10 text-center">
                <p className="text-text-muted text-sm">No hosted rooms yet</p>
              </div>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <SkeletonStatBar />
          ) : (
            <div className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] px-4 py-3">
              <div className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-medium text-text-primary">{stats.hostedCount}</span>
                  <span className="text-[11px] text-text-muted">Hosted</span>
                </div>
                <div className="mx-3 h-5 border-r border-fade-border" style={{ width: "0.5px" }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-medium text-text-primary">{stats.playedCount}</span>
                  <span className="text-[11px] text-text-muted">Played</span>
                </div>
                <div className="mx-3 h-5 border-r border-fade-border" style={{ width: "0.5px" }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-medium text-text-primary">{stats.totalPoints}</span>
                  <span className="text-[11px] text-text-muted">Points</span>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <SkeletonInvitePanel />
          ) : (
            <div className="rounded-lg bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-text-primary text-sm font-semibold">Invitations</h3>
                {filteredInvites.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-accent/15 text-blue-accent text-[10px] font-semibold">
                    {filteredInvites.length}
                  </span>
                )}
              </div>

              {filteredInvites.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {filteredInvites.map((invite) => (
                    <div
                      key={invite.inviteId}
                      className="rounded-md border-white/[0.08] p-3"
                    >
                      <div className="flex items-start gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-accent/20 border border-blue-accent/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-blue-accent">
                            {invite.hostName
                              .split(" ")
                              .filter(Boolean)
                              .map((w) => w[0]?.toUpperCase())
                              .slice(0, 2)
                              .join("")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-text-primary text-xs font-medium leading-snug">
                            <span className="text-text-secondary">{invite.hostName}</span>{" "}
                            invited you to{" "}
                            <span className="text-text-primary">{invite.roomTitle}</span>
                          </p>
                          <p className="text-text-muted text-[10px] mt-0.5">
                            via email · {timeAgo(invite.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(invite)}
                          className="flex-1 py-1.5 rounded-md bg-blue-accent text-white text-[11px] font-medium hover:bg-blue-accent/80 transition-colors"
                        >
                          Join
                        </button>
                        <button
                          onClick={() => handleDismissInvite(invite.inviteId)}
                          className="flex-1 py-1.5 rounded-md border-white/[0.08] text-text-muted text-[11px] font-medium hover:text-text-secondary hover:bg-white/4 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-text-muted text-xs">No pending invitations</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        workspaceId={workspaceId}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleRoomCreated}
      />

      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-text-primary font-semibold text-lg">Delete room?</h2>
              <button
                onClick={() => { setRoomToDelete(null); setDeleteError(null); }}
                disabled={deleteLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/6 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-text-muted text-sm mb-5">
              <span className="text-text-primary font-medium">{roomToDelete.title}</span> will be permanently removed, along with its participants, invites, questions, and answers. This cannot be undone.
            </p>

            {deleteError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-300 mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setRoomToDelete(null); setDeleteError(null); }}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg border-white/[0.08] text-text-secondary text-sm font-medium hover:bg-white/4 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-500/80 transition-colors disabled:opacity-40"
              >
                {deleteLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-semibold text-lg">Join by Code</h2>
              <button
                onClick={() => setShowJoinDialog(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/6 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-text-muted text-sm mb-4">
              Enter the 6-digit code shared by the host to join their study room.
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "")); setJoinError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
              placeholder="000000"
              className="w-full rounded-lg border-white/[0.08] bg-white/3 px-3 py-3 text-text-primary text-center text-2xl font-bold tracking-[0.5em] placeholder:text-text-muted/40 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-blue-accent/50 transition-colors mb-3"
            />

            {joinError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-300 mb-3">
                {joinError}
              </div>
            )}

            <button
              onClick={handleJoinByCode}
              disabled={joinLoading || otpInput.length !== 6}
              className="w-full py-3 rounded-lg bg-blue-accent text-white font-medium text-sm transition-all duration-200 hover:bg-blue-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {joinLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                "Join Room"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
