"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Mail, Clock, Crown } from "lucide-react";
import type { ActiveInvitation, RecentRoom, HostedRoom } from "@/types/studyRoom";
import {
  getActiveInvitations,
  getRecentRooms,
  getHostedRooms,
} from "@/services/studyRoom.service";
import InvitationCard from "./study-room/InvitationCard";
import RoomCard from "./study-room/RoomCard";
import EmptyState from "./study-room/EmptyState";
import CreateRoomModal from "./study-room/CreateRoomModal";

interface StudyRoomLandingProps {
  workspaceId: string;
  onJoinRoom?: (roomId: string) => void;
  onGoToLobby?: (roomId: string) => void;
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

  const handleRoomCreated = (roomId: string) => {
    setShowCreateModal(false);
    onGoToLobby?.(roomId);
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-accent text-white text-sm font-medium transition-all duration-200 hover:bg-blue-accent/80"
        >
          <Plus className="w-4 h-4" />
          Create Room
        </button>
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
    </div>
  );
}
