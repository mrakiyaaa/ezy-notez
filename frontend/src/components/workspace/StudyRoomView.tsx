"use client";

import { useState, useCallback } from "react";
import type { StudyRoom } from "@/types/studyRoom";
import StudyRoomLanding from "./StudyRoomLanding";
import StudyRoomLobby from "./StudyRoomLobby";
import StudyRoomQuiz from "./StudyRoomQuiz";
import StudyRoomResults from "./StudyRoomResults";

interface StudyRoomViewProps {
  workspaceId: string;
}

type ViewMode = "landing" | "lobby" | "quiz" | "results";

export default function StudyRoomView({ workspaceId }: StudyRoomViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("landing");
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);

  const handleGoToLobby = useCallback((roomId: string) => {
    // In production, fetch room details; for now create a mock
    setActiveRoom({
      id: roomId,
      workspace_id: workspaceId,
      title: "Study Session",
      question_count: 20,
      invite_method: "otp",
      otp_code: "482916",
      status: "waiting",
      host_id: "current-user",
      host_name: "You",
      resource_ids: [],
      created_at: new Date().toISOString(),
    });
    setViewMode("lobby");
  }, [workspaceId]);

  const handleJoinRoom = useCallback((roomId: string) => {
    handleGoToLobby(roomId);
  }, [handleGoToLobby]);

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
