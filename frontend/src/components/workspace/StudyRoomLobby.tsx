"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Crown, AlertTriangle, Play, Users } from "lucide-react";
import type { Participant, StudyRoom } from "@/types/studyRoom";
import { getLobbyParticipants, startRoom } from "@/services/studyRoom.service";
import { supabase } from "@/lib/supabase/client";
import ParticipantAvatar from "./study-room/ParticipantAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudyRoomLobbyProps {
  room: StudyRoom;
  onQuizStarted: () => void;
  onBack: () => void;
}

export default function StudyRoomLobby({
  room,
  onQuizStarted,
  onBack,
}: StudyRoomLobbyProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [otpCopied, setOtpCopied] = useState(false);
  const [disconnectBanner, setDisconnectBanner] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const isHost = room.host_id === "current-user";
  const hasEnoughParticipants = participants.length >= 2;

  // Fetch initial participants
  useEffect(() => {
    getLobbyParticipants(room.id)
      .then(setParticipants)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [room.id]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase.channel(`study-room:${room.id}`);

    channel
      .on("broadcast", { event: "participant:joined" }, (payload) => {
        console.log("[Lobby] participant:joined", payload);
        const newParticipant = payload.payload as Participant;
        setParticipants((prev) => {
          if (prev.some((p) => p.id === newParticipant.id)) return prev;
          return [...prev, newParticipant];
        });
      })
      .on("broadcast", { event: "participant:disconnected" }, (payload) => {
        console.log("[Lobby] participant:disconnected", payload);
        const name = (payload.payload as { name?: string })?.name ?? "A participant";
        setDisconnectBanner(`${name} has disconnected`);
        setTimeout(() => setDisconnectBanner(null), 5000);
      })
      .on("broadcast", { event: "quiz:started" }, (payload) => {
        console.log("[Lobby] quiz:started", payload);
        onQuizStarted();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, onQuizStarted]);

  const copyOtp = useCallback(() => {
    if (!room.otp_code) return;
    navigator.clipboard.writeText(room.otp_code);
    setOtpCopied(true);
    setTimeout(() => setOtpCopied(false), 2000);
  }, [room.otp_code]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await startRoom(room.id);
      onQuizStarted();
    } catch (err) {
      console.error("[Lobby] Failed to start room:", err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-text-muted text-sm hover:text-text-primary transition-colors mb-6"
      >
        &larr; Back to Study Room
      </button>

      {/* Room Info */}
      <div className="text-center mb-8">
        <h2 className="text-text-primary text-2xl font-semibold">{room.title}</h2>
        {room.description && (
          <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
            {room.description}
          </p>
        )}
      </div>

      {/* OTP Code Display */}
      {room.invite_method === "otp" && room.otp_code && (
        <div className="rounded-xl border border-fade-border bg-bg-card/60 backdrop-blur-sm p-6 mb-6 text-center">
          <p className="text-text-secondary text-sm mb-4">
            Share this code with friends to join
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-2">
              {room.otp_code.split("").map((digit, i) => (
                <span
                  key={i}
                  className="w-12 h-16 rounded-lg bg-white/[0.05] border border-blue-accent/30 flex items-center justify-center text-text-primary text-3xl font-bold sr-pulse-glow"
                >
                  {digit}
                </span>
              ))}
            </div>
            <button
              onClick={copyOtp}
              className="p-3 rounded-lg bg-white/[0.06] border border-fade-border text-text-muted hover:text-text-primary hover:bg-white/[0.1] transition-colors"
              title="Copy OTP"
            >
              {otpCopied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Disconnect Banner */}
      {disconnectBanner && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-4 sr-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {disconnectBanner}
        </div>
      )}

      {/* Participants */}
      <div className="rounded-xl border border-fade-border bg-bg-card/60 backdrop-blur-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide">
            Participants
          </h3>
          <div className="flex items-center gap-1.5 text-text-muted">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">{participants.length}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {participants.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-fade-border sr-slide-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <ParticipantAvatar participant={p} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary text-sm font-medium truncate">
                      {p.name}
                    </span>
                    {p.is_host && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-medium">
                        <Crown className="w-2.5 h-2.5" />
                        Host
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] ${
                    p.status === "connected" ? "text-green-400" : "text-text-muted"
                  }`}
                >
                  {p.status === "connected" ? "Online" : "Offline"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Button (host only) */}
      {isHost && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <button
                  onClick={handleStart}
                  disabled={!hasEnoughParticipants || starting}
                  className="w-full py-3 rounded-lg bg-blue-accent text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:bg-blue-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {starting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Room
                    </>
                  )}
                </button>
              </div>
            </TooltipTrigger>
            {!hasEnoughParticipants && (
              <TooltipContent>
                <p>Waiting for at least 1 friend to join</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Non-host waiting text */}
      {!isHost && (
        <div className="text-center py-4">
          <p className="text-text-muted text-sm">
            Waiting for the host to start the room...
          </p>
        </div>
      )}
    </div>
  );
}
