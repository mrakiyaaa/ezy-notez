"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudyRoomLanding from "@/components/study-room/StudyRoomLanding";

export default function StudyRoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromWorkspaceId = searchParams.get("from");

  useEffect(() => {
    if (!fromWorkspaceId) {
      router.replace("/workspaces");
    }
  }, [fromWorkspaceId, router]);

  if (!fromWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <StudyRoomLanding workspaceId={fromWorkspaceId} />;
}
