"use client";

import { useParams, useSearchParams } from "next/navigation";
import StudyRoomResults from "@/components/study-room/StudyRoomResults";

export default function StudyRoomResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const fromWorkspaceId = searchParams.get("from") ?? undefined;

  return <StudyRoomResults roomId={roomId} fromWorkspaceId={fromWorkspaceId} />;
}
