"use client";

import type { Participant } from "@/types/studyRoom";

interface ParticipantAvatarProps {
  participant: Participant;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  showConfirmed?: boolean;
}

const sizeMap = {
  sm: { container: "w-8 h-8", text: "text-xs", dot: "w-2 h-2", confirm: "w-3.5 h-3.5" },
  md: { container: "w-10 h-10", text: "text-sm", dot: "w-2.5 h-2.5", confirm: "w-4 h-4" },
  lg: { container: "w-12 h-12", text: "text-base", dot: "w-3 h-3", confirm: "w-5 h-5" },
};

export default function ParticipantAvatar({
  participant,
  size = "md",
  showStatus = true,
  showConfirmed = false,
}: ParticipantAvatarProps) {
  const s = sizeMap[size];
  const initials = participant.name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="relative inline-flex">
      <div
        className={`${s.container} rounded-full bg-blue-accent/20 border border-blue-accent/30 flex items-center justify-center overflow-hidden`}
      >
        {participant.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={participant.avatar_url}
            alt={participant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={`${s.text} font-semibold text-blue-accent`}>
            {initials || "?"}
          </span>
        )}
      </div>

      {/* Online status dot */}
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${s.dot} rounded-full border-2 border-bg-card ${
            participant.status === "connected" ? "bg-green-400" : "bg-text-muted"
          }`}
        />
      )}

      {/* Confirmed tick */}
      {showConfirmed && (
        <span
          className={`absolute -top-1 -right-1 ${s.confirm} rounded-full flex items-center justify-center ${
            participant.has_confirmed
              ? "bg-green-500"
              : "bg-white/10 border border-fade-border"
          }`}
        >
          {participant.has_confirmed ? (
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
          )}
        </span>
      )}
    </div>
  );
}
