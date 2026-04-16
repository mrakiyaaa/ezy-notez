"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Mail, Clock, Crown, KeyRound, X } from "lucide-react";
import type { ActiveInvitation, RecentRoom, HostedRoom, StudyRoom } from "@/types/studyRoom";
import {
  getActiveInvitations,
  getRecentRooms,
  getHostedRooms,
} from "@/services/studyRoom.service";
import { apiClient } from "@/api/axios-config";
import InvitationCard from "./study-room/InvitationCard";
import RoomCard from "./study-room/RoomCard";
import EmptyState from "./study-room/EmptyState";
import CreateRoomModal from "./study-room/CreateRoomModal";

interface StudyRoomLandingProps {
  workspaceId: string;
  onJoinRoom?: (roomId: string) => void;
  onGoToLobby?: (room: StudyRoom) => void;
}

export default function StudyRoomLanding({
  workspaceId,
  onJoinRoom,
  onGoToLobby,
}: StudyRoomLandingProps) {
  const [invitations, setInvitations] = useState<ActiveInvitation[]>([]);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [hostedRooms, setHostedRooms] = useState<HostedRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Join by code dialog state
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [inv, recent, hosted] = await Promise.all([
        getActiveInvitations(workspaceId),
        getRecentRooms(workspaceId),
        getHostedRooms(workspaceId),
      ]);
      setInvitations(inv);
      setRecentRooms(recent);
      setHostedRooms(hosted);
    } catch (err) {
      console.error("[StudyRoomLanding] Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleJoin = (roomId: string) => {
    onJoinRoom?.(roomId);
  };

  const handleRoomCreated = (room: StudyRoom) => {
    setShowCreateModal(false);
    onGoToLobby?.(room);
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
      onGoToLobby?.(data.room);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to join room";
      setJoinError(msg);
    } finally {
      setJoinLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-text-primary text-xl font-semibold">Study Room</h2>
          <p className="text-text-muted text-sm mt-1">
            Collaborate with friends in real-time quiz battles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowJoinDialog(true); setJoinError(null); setOtpInput(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-fade-border bg-white/[0.04] text-text-secondary text-sm font-medium transition-all duration-200 hover:bg-white/[0.08]"
          >
            <KeyRound className="w-4 h-4" />
            Join by Code
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-accent text-white text-sm font-medium transition-all duration-200 hover:bg-blue-accent/80"
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
        </div>
      </div>

      {/* Active Invitations */}
      <section className="mb-8">
        <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide mb-4">
          Active Invitations
        </h3>
        {invitations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map((inv) => (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                onJoin={handleJoin}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-fade-border bg-bg-card/40 backdrop-blur-sm">
            <EmptyState
              icon={Mail}
              title="No active invitations"
              description="When someone invites you to a study room, it will appear here"
            />
          </div>
        )}
      </section>

      {/* Recent Rooms */}
      <section className="mb-8">
        <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide mb-4">
          Recent Rooms
        </h3>
        {recentRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentRooms.map((room) => (
              <RoomCard
                key={room.id}
                title={room.title}
                date={room.date}
                participantCount={room.participant_count}
                status={room.status}
                score={room.score}
                totalQuestions={room.total_questions}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-fade-border bg-bg-card/40 backdrop-blur-sm">
            <EmptyState
              icon={Clock}
              title="No recent rooms"
              description="Rooms you've participated in will show up here"
            />
          </div>
        )}
      </section>

      {/* My Hosted Rooms */}
      <section>
        <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide mb-4">
          My Hosted Rooms
        </h3>
        {hostedRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hostedRooms.map((room) => (
              <RoomCard
                key={room.id}
                title={room.title}
                date={room.date}
                participantCount={room.participant_count}
                status={room.status}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-fade-border bg-bg-card/40 backdrop-blur-sm">
            <EmptyState
              icon={Crown}
              title="No hosted rooms yet"
              description="Create your first study room to start collaborating"
            />
          </div>
        )}
      </section>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        workspaceId={workspaceId}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleRoomCreated}
      />

      {/* Join by Code Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-bg-card border border-fade-border shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-semibold text-lg">Join by Code</h2>
              <button
                onClick={() => setShowJoinDialog(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
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
              className="w-full rounded-lg border border-fade-border bg-white/[0.03] px-3 py-3 text-text-primary text-center text-2xl font-bold tracking-[0.5em] placeholder:text-text-muted/40 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-blue-accent/50 transition-colors mb-3"
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
