"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StudyRoom } from "@/types/studyRoom";
import StudyRoomLanding from "./StudyRoomLanding";
import StudyRoomLobby from "./StudyRoomLobby";
import StudyRoomQuiz from "./StudyRoomQuiz";
import StudyRoomResults from "./StudyRoomResults";
import { apiClient } from "@/api/axios-config";

interface StudyRoomViewProps {
  workspaceId: string;
}

type ViewMode = "landing" | "lobby" | "quiz" | "results";

export default function StudyRoomView({ workspaceId }: StudyRoomViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("landing");
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);

  /** Navigate to the lobby with a real room object (from create or join). */
  const handleGoToLobby = useCallback((room: StudyRoom) => {
    setActiveRoom(room);
    setViewMode("lobby");
  }, []);

  /**
   * Called when user clicks "Join" on an invitation card.
   * Fetches the room details from the backend and goes to the lobby.
   */
  const handleJoinRoom = useCallback(async (roomId: string) => {
    try {
      const response = await apiClient.get(`/study-rooms/${roomId}`);
      const data = response.data.data as { room: StudyRoom };
      setActiveRoom(data.room);
      setViewMode("lobby");
    } catch (err) {
      console.error("[StudyRoomView] Failed to fetch room:", err);
    }
  }, []);

  // Auto-enter the lobby when navigated here with ?room=<id> (e.g. after
  // accepting an invite from the workspaces hub sidebar). handleJoinRoom
  // resolves asynchronously, so the setState calls land after commit.
  useEffect(() => {
    const roomId = searchParams.get("room");
    if (!roomId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void handleJoinRoom(roomId);

    // Strip the query params so we don't re-trigger on back-navigation.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("room");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname);
  }, [searchParams, handleJoinRoom, router]);

  const handleQuizStarted = useCallback(() => {
    setViewMode("quiz");
  }, []);

  const handleRoomEnded = useCallback(() => {
    setViewMode("results");
  }, []);

  const handleBackToLanding = useCallback(() => {
    setActiveRoom(null);
    setViewMode("landing");
  }, []);

  switch (viewMode) {
    case "landing":
      return (
        <StudyRoomLanding
          workspaceId={workspaceId}
          onJoinRoom={handleJoinRoom}
          onGoToLobby={handleGoToLobby}
        />
      );

    case "lobby":
      if (!activeRoom) return null;
      return (
        <StudyRoomLobby
          room={activeRoom}
          onQuizStarted={handleQuizStarted}
          onBack={handleBackToLanding}
        />
      );

    case "quiz":
      if (!activeRoom) return null;
      return (
        <StudyRoomQuiz
          room={activeRoom}
          onRoomEnded={handleRoomEnded}
        />
      );

    case "results":
      if (!activeRoom) return null;
      return (
        <StudyRoomResults
          roomId={activeRoom.id}
          onBack={handleBackToLanding}
        />
      );
  }
}
