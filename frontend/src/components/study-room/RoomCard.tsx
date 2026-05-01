"use client";

import { Users, Calendar } from "lucide-react";
import type { RoomStatus } from "@/types/studyRoom";

interface RoomCardProps {
  title: string;
  date: string;
  participantCount: number;
  status: RoomStatus;
  score?: number;
  totalQuestions?: number;
}

function StatusBadge({ status }: { status: RoomStatus }) {
  const config: Record<RoomStatus, { label: string; bg: string; text: string }> = {
    completed: {
      label: "Completed",
      bg: "rgba(34, 197, 94, 0.12)",
      text: "#22c55e",
    },
    in_progress: {
      label: "In Progress",
      bg: "rgba(80, 125, 188, 0.12)",
      text: "#507DBC",
    },
    waiting: {
      label: "Waiting",
      bg: "rgba(251, 191, 36, 0.12)",
      text: "#fbbf24",
    },
  };

  const s = config[status];

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

export default function RoomCard({
  title,
  date,
  participantCount,
  status,
  score,
  totalQuestions,
}: RoomCardProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="group relative rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/60 backdrop-blur-sm p-5 transition-all duration-200 hover:border-blue-accent/40 hover:shadow-[0_0_20px_rgba(80,125,188,0.15)]">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-text-primary font-medium text-sm truncate flex-1">
          {title}
        </h4>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Calendar className="w-3 h-3" />
          <span className="text-[11px]">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Users className="w-3 h-3" />
          <span className="text-[11px]">{participantCount} participants</span>
        </div>
      </div>

      {score !== undefined && totalQuestions !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-accent transition-all duration-300"
              style={{
                width: `${totalQuestions > 0 ? (score / totalQuestions) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[11px] text-text-secondary font-medium">
            {score}/{totalQuestions}
          </span>
        </div>
      )}
    </div>
  );
}
