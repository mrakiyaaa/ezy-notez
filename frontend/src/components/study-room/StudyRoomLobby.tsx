"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Crown, AlertTriangle, Play, Users, UserPlus, Plus, Trash2, X, Mail } from "lucide-react";
import type { Participant, StudyRoom } from "@/types/studyRoom";
import { getLobbyParticipants, startRoom, sendLobbyInvites } from "@/services/studyRoom.service";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import ParticipantAvatar from "./ParticipantAvatar";
import VoicePanel from "./VoicePanel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudyRoomLobbyProps {
  room: StudyRoom;
  fromWorkspaceId?: string;
}

export default function StudyRoomLobby({
  room,
  fromWorkspaceId,
}: StudyRoomLobbyProps) {
  const router = useRouter();
  const fromQuery = fromWorkspaceId ? `?from=${fromWorkspaceId}` : "";

  const goToSession = useCallback(() => {
    router.push(`/study-rooms/${room.id}/session${fromQuery}`);
  }, [router, room.id, fromQuery]);

  const goBack = useCallback(() => {
    router.push(`/study-rooms${fromQuery}`);
  }, [router, fromQuery]);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [otpCopied, setOtpCopied] = useState(false);
  const [disconnectBanner, setDisconnectBanner] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const isHost = !!currentUserId && room.host_id === currentUserId;
  const hasEnoughParticipants = participants.length >= 2;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    getLobbyParticipants(room.id)
      .then(setParticipants)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [room.id]);

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase.channel(`study-room:${room.id}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "participant:joined" }, (payload) => {
        try {
          const data = payload.payload as {
            userId?: string;
            displayName?: string;
            isHost?: boolean;
            joinedAt?: string;
          };
          if (!data?.userId) return;

          const newParticipant: Participant = {
            id: data.userId,
            user_id: data.userId,
            name: data.displayName ?? "Unknown",
            is_host: data.isHost ?? false,
            status: "connected",
            points: 0,
            has_confirmed: false,
          };

          setParticipants((prev) => {
            if (prev.some((p) => p.user_id === data.userId)) return prev;
            return [...prev, newParticipant];
          });
        } catch (err) {
          console.error("[Lobby] participant:joined handler error:", err);
        }
      })
      .on("broadcast", { event: "participant:disconnected" }, (payload) => {
        try {
          const data = payload.payload as { userId?: string };
          if (data?.userId) {
            setParticipants((prev) =>
              prev.filter((p) => p.user_id !== data.userId),
            );
          }
          setDisconnectBanner("A participant has disconnected");
          setTimeout(() => setDisconnectBanner(null), 5000);
        } catch (err) {
          console.error("[Lobby] participant:disconnected handler error:", err);
        }
      })
      .on("broadcast", { event: "quiz:started" }, (payload) => {
        try {
          const data = payload.payload as { question?: unknown };
          if (data?.question) {
            try {
              sessionStorage.setItem(
                `ezn_room_first_question_${room.id}`,
                JSON.stringify(data.question),
              );
            } catch {
              // sessionStorage may be unavailable in some contexts — not fatal
            }
          }
          goToSession();
        } catch (err) {
          console.error("[Lobby] quiz:started handler error:", err);
          goToSession();
        }
      })
      .subscribe((status) => {
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setChannelError(
            "Lost connection to room. Please refresh the page.",
          );
        } else if (status === "SUBSCRIBED") {
          setChannelError(null);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room.id, goToSession]);

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
      goToSession();
    } catch (err) {
      console.error("[Lobby] Failed to start room:", err);
    } finally {
      setStarting(false);
    }
  };

  const addInviteEmail = () => {
    const trimmed = inviteEmailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setInviteError("Please enter a valid email address");
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setInviteError("Email already added");
      return;
    }
    setInviteEmails((prev) => [...prev, trimmed]);
    setInviteEmailInput("");
    setInviteError(null);
  };

  const handleSendInvites = async () => {
    let emailsToSend = inviteEmails;

    if (inviteEmailInput.trim()) {
      const trimmed = inviteEmailInput.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setInviteError("Please enter a valid email address");
        return;
      }
      if (!inviteEmails.includes(trimmed)) {
        emailsToSend = [...inviteEmails, trimmed];
        setInviteEmails(emailsToSend);
        setInviteEmailInput("");
      }
    }

    if (emailsToSend.length === 0) {
      setInviteError("Add at least one email address");
      return;
    }

    setInviteSending(true);
    setInviteError(null);
    try {
      const result = await sendLobbyInvites(room.id, emailsToSend);
      const msg = result.skipped > 0
        ? `Sent ${result.sent} invite${result.sent !== 1 ? "s" : ""}. ${result.skipped} already invited.`
        : `Sent ${result.sent} invite${result.sent !== 1 ? "s" : ""} successfully!`;
      setInviteSuccess(msg);
      setInviteEmails([]);
      setInviteEmailInput("");
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 2500);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitations");
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={goBack}
        className="text-text-muted text-sm hover:text-text-primary transition-colors mb-6"
      >
        &larr; Back to Study Room
      </button>

      <div className="text-center mb-8">
        <h2 className="text-text-primary text-2xl font-semibold">{room.title}</h2>
        {room.description && (
          <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
            {room.description}
          </p>
        )}
      </div>

      {room.invite_method === "otp" && room.otp_code && (
        <div className="rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/60 backdrop-blur-sm p-6 mb-6 text-center">
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
              className="p-3 rounded-lg bg-white/[0.06] border-white/[0.08] text-text-muted hover:text-text-primary hover:bg-white/[0.1] transition-colors"
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

      {channelError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-4 sr-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {channelError}
        </div>
      )}

      {disconnectBanner && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-4 sr-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {disconnectBanner}
        </div>
      )}

      {currentUserId && (
        <VoicePanel
          roomId={room.id}
          currentUserId={currentUserId}
          currentUserName={
            participants.find((p) => p.user_id === currentUserId)?.name
          }
          currentUserAvatar={
            participants.find((p) => p.user_id === currentUserId)?.avatar_url ?? null
          }
        />
      )}

      <div className="rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/60 backdrop-blur-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide">
            Participants
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">{participants.length}</span>
            </div>
            {isHost && (
              <button
                onClick={() => { setShowInviteModal(true); setInviteError(null); setInviteSuccess(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-accent/15 border border-blue-accent/30 text-blue-accent text-xs font-medium hover:bg-blue-accent/25 transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                Add Friends
              </button>
            )}
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border-white/[0.08] sr-slide-in"
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

      {!isHost && (
        <div className="text-center py-4">
          <p className="text-text-muted text-sm">
            Waiting for the host to start the room...
          </p>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-fade-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-accent/15 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-accent" />
                </div>
                <h3 className="text-text-primary font-semibold text-base">Invite Friends</h3>
              </div>
              <button
                onClick={() => { setShowInviteModal(false); setInviteEmails([]); setInviteEmailInput(""); setInviteError(null); setInviteSuccess(null); }}
                className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/6 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {inviteSuccess ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-text-primary text-sm font-medium text-center">{inviteSuccess}</p>
                </div>
              ) : (
                <>
                  <p className="text-text-muted text-sm">
                    Enter email addresses to send invite links. Friends will receive an email to join this room.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmailInput}
                      onChange={(e) => { setInviteEmailInput(e.target.value); setInviteError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInviteEmail())}
                      placeholder="friend@email.com"
                      className="flex-1 rounded-lg border-white/[0.08] bg-white/3 px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-accent/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={addInviteEmail}
                      className="px-3 py-2 rounded-lg bg-white/6 border-white/[0.08] text-text-secondary hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {inviteEmails.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {inviteEmails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border-white/[0.08]"
                        >
                          <span className="text-sm text-text-secondary truncate">{email}</span>
                          <button
                            type="button"
                            onClick={() => setInviteEmails((prev) => prev.filter((e) => e !== email))}
                            className="text-text-muted hover:text-red-400 transition-colors shrink-0 ml-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {inviteError && (
                    <p className="text-red-400 text-xs">{inviteError}</p>
                  )}

                  <button
                    onClick={handleSendInvites}
                    disabled={inviteSending}
                    className="w-full py-2.5 rounded-lg bg-blue-accent text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {inviteSending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        Send Invitations
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
