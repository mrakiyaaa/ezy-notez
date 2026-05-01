"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import StudyRoomQuiz from "@/components/study-room/StudyRoomQuiz";
import { getStudyRoomById } from "@/services/studyRoom.service";
import type { StudyRoom } from "@/types/studyRoom";

export default function StudyRoomSessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const fromWorkspaceId = searchParams.get("from") ?? undefined;

  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let mounted = true;
    getStudyRoomById(roomId)
      .then((r) => { if (mounted) setRoom(r); })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load room");
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-text-primary text-sm font-medium mb-1">
              Could not load this session
            </p>
            <p className="text-text-muted text-xs">
              {error ?? "Room not found."}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(fromWorkspaceId ? `/study-rooms?from=${fromWorkspaceId}` : "/workspaces")}
          className="w-full py-2.5 rounded-lg border-white/[0.08] bg-white/[0.04] text-text-secondary text-sm font-medium hover:bg-white/[0.08] transition-colors"
        >
          Back to Study Room
        </button>
      </div>
    );
  }

  return <StudyRoomQuiz room={room} fromWorkspaceId={fromWorkspaceId} />;
}
