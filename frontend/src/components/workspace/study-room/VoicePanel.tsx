"use client";

import { useMemo } from "react";
import { Mic, MicOff, PhoneOff, AlertTriangle, Loader2 } from "lucide-react";
import { useVoiceRoom, type VoicePeerState } from "@/hooks/useVoiceRoom";

interface VoicePanelProps {
  roomId: string;
  currentUserId: string | null;
  currentUserName?: string;
  currentUserAvatar?: string | null;
}

const MAX_PARTICIPANTS = 6;

export default function VoicePanel({
  roomId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: VoicePanelProps) {
  const {
    joined,
    connecting,
    muted,
    error,
    warning,
    peers,
    selfSpeaking,
    localAudioLevel,
    speakingUsers,
    maxParticipants,
    join,
    leave,
    toggleMute,
  } = useVoiceRoom({
    roomId,
    userId: currentUserId,
    maxParticipants: MAX_PARTICIPANTS,
  });

  const totalCount = (joined ? 1 : 0) + peers.length;
  const overCapacity = totalCount > maxParticipants;

  // Ring scale/opacity driven by localAudioLevel. When silent the ring is
  // barely visible; as level rises it scales out and brightens.
  const ringScale = 1 + localAudioLevel * 0.45;
  const ringOpacity = 0.12 + localAudioLevel * 0.58;

  return (
    <div className="rounded-xl bg-bg-card/60 border border-fade-border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide">
            Voice Chat
          </h3>
          <p className="text-text-muted text-xs mt-0.5">
            {joined
              ? `${totalCount} active · WebRTC P2P`
              : "Talk with the room — no setup required"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {joined && (
            // Relative wrapper so the ring <span> can be positioned absolutely
            // around the button without affecting its size or click area.
            <span className="relative inline-flex">
              <button
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? "Unmute" : "Mute"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  muted
                    ? "bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25"
                    : "bg-white/[0.04] border-fade-border text-text-secondary hover:bg-white/[0.08]"
                }`}
              >
                {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {muted ? "Muted" : "Mic on"}
              </button>

              {/* Animated ring driven by localAudioLevel */}
              {!muted && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-lg"
                  style={{
                    inset: "-3px",
                    border: "1.5px solid var(--color-blue-accent)",
                    transform: `scale(${ringScale})`,
                    opacity: ringOpacity,
                  }}
                />
              )}
            </span>
          )}

          {joined ? (
            <button
              onClick={leave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-500/25 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Leave
            </button>
          ) : (
            <button
              onClick={join}
              disabled={connecting || !currentUserId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-accent/15 border border-blue-accent/30 text-blue-accent text-xs font-medium hover:bg-blue-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
              {connecting ? "Connecting..." : "Join Voice"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs mb-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {(warning || overCapacity) && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {warning ??
              `Voice rooms are best with ${maxParticipants} or fewer participants — quality may degrade.`}
          </span>
        </div>
      )}

      {joined ? (
        <VoiceParticipantList
          self={{
            userId: currentUserId ?? "self",
            name: currentUserName ?? "You",
            avatarUrl: currentUserAvatar ?? null,
            muted,
            speaking: !muted && selfSpeaking,
          }}
          peers={peers}
          speakingUsers={speakingUsers}
        />
      ) : (
        <p className="text-text-muted text-xs">
          Click <span className="text-text-secondary">Join Voice</span> to enable your
          microphone and start talking with the room.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Participant list
// ---------------------------------------------------------------------------

interface VoiceParticipantListProps {
  self: VoicePeerState;
  peers: VoicePeerState[];
  speakingUsers: Set<string>;
}

function VoiceParticipantList({ self, peers, speakingUsers }: VoiceParticipantListProps) {
  const rows = useMemo(() => [self, ...peers], [self, peers]);

  return (
    <ul className="space-y-2">
      {rows.map((p) => (
        <VoiceParticipantRow
          key={p.userId}
          participant={p}
          isSelf={p === self}
          isSpeaking={speakingUsers.has(p.userId)}
        />
      ))}
    </ul>
  );
}

interface VoiceParticipantRowProps {
  participant: VoicePeerState;
  isSelf: boolean;
  isSpeaking: boolean;
}

function VoiceParticipantRow({ participant, isSelf, isSpeaking }: VoiceParticipantRowProps) {
  const initials = (participant.name || "?")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <li
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors duration-150 ${
        participant.speaking
          ? "bg-blue-accent/10 border-blue-accent/40"
          : "bg-white/[0.02] border-fade-border"
      }`}
    >
      {/* Avatar with glow ring when actively speaking */}
      <div
        className={`relative w-8 h-8 rounded-full bg-blue-accent/20 border flex items-center justify-center overflow-hidden ${
          participant.speaking ? "border-blue-accent" : "border-blue-accent/30"
        }`}
        style={{
          boxShadow: isSpeaking
            ? "0 0 0 2px rgba(80,125,188,0.55), 0 0 10px rgba(80,125,188,0.30)"
            : "none",
          transition: "box-shadow 150ms ease",
        }}
      >
        {participant.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={participant.avatarUrl}
            alt={participant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-blue-accent">
            {initials || "?"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-text-primary text-sm font-medium truncate">
          {participant.name}
          {isSelf && (
            <span className="text-text-muted text-[11px] font-normal ml-1.5">
              (you)
            </span>
          )}
        </span>
        {/* Animated sound-wave bars — visible while actively speaking */}
        {isSpeaking && !participant.muted && <SpeakingIndicator />}
      </div>

      <div className="flex items-center gap-2">
        {/* Legacy speaking indicator kept for non-rAF speaking decay */}
        {participant.speaking && !isSpeaking && !participant.muted && (
          <SpeakingIndicator />
        )}
        {participant.muted ? (
          <MicOff className="w-3.5 h-3.5 text-text-muted" aria-label="Muted" />
        ) : (
          <Mic
            className={`w-3.5 h-3.5 ${
              participant.speaking ? "text-blue-accent" : "text-text-muted"
            }`}
            aria-label="Mic active"
          />
        )}
      </div>
    </li>
  );
}

function SpeakingIndicator() {
  return (
    <span className="flex items-end gap-0.5 h-3.5 shrink-0" aria-hidden="true">
      <span className="w-0.5 bg-blue-accent rounded-sm voice-bar voice-bar-1" />
      <span className="w-0.5 bg-blue-accent rounded-sm voice-bar voice-bar-2" />
      <span className="w-0.5 bg-blue-accent rounded-sm voice-bar voice-bar-3" />
      <style dangerouslySetInnerHTML={{ __html: `
        .voice-bar { animation: voice-pulse 0.9s ease-in-out infinite; height: 40%; }
        .voice-bar-2 { animation-delay: 0.15s; }
        .voice-bar-3 { animation-delay: 0.3s; }
        @keyframes voice-pulse { 0%, 100% { height: 30%; } 50% { height: 100%; } }
      ` }} />
    </span>
  );
}
