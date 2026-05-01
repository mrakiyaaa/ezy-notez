"use client";

import { Mail, KeyRound } from "lucide-react";
import type { ActiveInvitation } from "@/types/studyRoom";

interface InvitationCardProps {
  invitation: ActiveInvitation;
  onJoin: (roomId: string) => void;
}

export default function InvitationCard({ invitation, onJoin }: InvitationCardProps) {
  return (
    <div className="group relative rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/60 backdrop-blur-sm p-5 transition-all duration-200 hover:border-blue-accent/40 hover:shadow-[0_0_20px_rgba(80,125,188,0.15)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-text-primary font-medium text-sm truncate">
            {invitation.room_title}
          </h4>
          <p className="text-text-muted text-xs mt-1">
            Hosted by {invitation.host_name}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {invitation.invite_method === "otp" ? (
              <KeyRound className="w-3 h-3 text-text-muted" />
            ) : (
              <Mail className="w-3 h-3 text-text-muted" />
            )}
            <span className="text-[11px] text-text-muted">
              Invited via {invitation.invite_method === "otp" ? "OTP Code" : "Email"}
            </span>
          </div>
        </div>
        <button
          onClick={() => onJoin(invitation.room_id)}
          className="shrink-0 px-4 py-1.5 rounded-lg bg-blue-accent text-white text-xs font-medium transition-all duration-200 hover:bg-blue-accent/80"
        >
          Join
        </button>
      </div>
    </div>
  );
}
