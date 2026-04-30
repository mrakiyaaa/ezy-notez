"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { joinVoiceRoom, leaveVoiceRoom } from "@/services/studyRoom.service";
import type { VoiceParticipantRow } from "@/types/studyRoom";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface VoicePeerState {
  userId: string;
  name: string;
  avatarUrl: string | null;
  muted: boolean;
  speaking: boolean;
}

export interface UseVoiceRoomResult {
  joined: boolean;
  connecting: boolean;
  muted: boolean;
  error: string | null;
  warning: string | null;
  peers: VoicePeerState[];
  selfSpeaking: boolean;
  localAudioLevel: number;
  speakingUsers: Set<string>;
  maxParticipants: number;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
}

interface UseVoiceRoomOptions {
  roomId: string;
  userId: string | null;
  enabled?: boolean;
  maxParticipants?: number;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

// 0–255 threshold used for the existing decay-based `speaking` boolean on peers
const SPEAKING_THRESHOLD = 18;
const SPEAKING_DECAY_MS = 250;

// Normalized 0–1 threshold used for the real-time `speakingUsers` Set
const SPEAKING_NORMALIZED_THRESHOLD = 0.05;

// ---------------------------------------------------------------------------
// Realtime payload shapes
// ---------------------------------------------------------------------------

type JoinPayload = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

type LeavePayload = { userId: string };

type SdpPayload = {
  fromUserId: string;
  toUserId: string;
  sdp: RTCSessionDescriptionInit;
};

type IcePayload = {
  fromUserId: string;
  toUserId: string;
  candidate: RTCIceCandidateInit;
};

// ---------------------------------------------------------------------------
// Internal per-peer record (NOT stored in React state — we keep refs because
// these objects mutate on every ICE event and recreating them would tear
// down audio).
// ---------------------------------------------------------------------------

interface PeerRecord {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  analyser: AnalyserNode | null;
  audioCtx: AudioContext | null;
  name: string;
  avatarUrl: string | null;
  muted: boolean;
  lastSpokeAt: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceRoom(
  options: UseVoiceRoomOptions,
): UseVoiceRoomResult {
  const { roomId, userId, enabled = true, maxParticipants = 6 } = options;

  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [peers, setPeers] = useState<VoicePeerState[]>([]);
  const [selfSpeaking, setSelfSpeaking] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  // Refs for live, non-render state
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerRecord>>(new Map());
  const selfAnalyserRef = useRef<AnalyserNode | null>(null);
  const selfAudioCtxRef = useRef<AudioContext | null>(null);
  const speakingRafRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);
  const profileRef = useRef<{ name: string; avatarUrl: string | null }>({
    name: "You",
    avatarUrl: null,
  });
  // Tracks previous speakingUsers membership to avoid 60fps state churn
  const prevSpeakingSetRef = useRef<Set<string>>(new Set());

  userIdRef.current = userId;

  // -------------------------------------------------------------------------
  // Sync peer state from refs into React state (call after any peer mutation)
  // -------------------------------------------------------------------------

  const publishPeers = useCallback(() => {
    const next: VoicePeerState[] = [];
    for (const [uid, rec] of peersRef.current) {
      next.push({
        userId: uid,
        name: rec.name,
        avatarUrl: rec.avatarUrl,
        muted: rec.muted,
        speaking: Date.now() - rec.lastSpokeAt < SPEAKING_DECAY_MS,
      });
    }
    setPeers(next);
  }, []);

  // -------------------------------------------------------------------------
  // Audio level loop — single rAF that polls every analyser
  // -------------------------------------------------------------------------

  const startSpeakingLoop = useCallback(() => {
    if (speakingRafRef.current !== null) return;

    const buffer = new Uint8Array(128);

    const tick = () => {
      const now = Date.now();

      // ── Local user ────────────────────────────────────────────────────────
      let selfLevel = 0;
      const selfAnalyser = selfAnalyserRef.current;
      if (selfAnalyser) {
        selfAnalyser.getByteFrequencyData(buffer);
        const avg = averageEnergy(buffer);
        selfLevel = avg / 255;
        setSelfSpeaking(avg > SPEAKING_THRESHOLD);
      } else {
        setSelfSpeaking(false);
      }
      setLocalAudioLevel(selfLevel);

      // ── Build speakingUsers (real-time, no decay) ─────────────────────────
      const nextSpeaking = new Set<string>();
      const me = userIdRef.current;
      if (me && selfLevel > SPEAKING_NORMALIZED_THRESHOLD) {
        nextSpeaking.add(me);
      }

      // ── Remote peers ──────────────────────────────────────────────────────
      let mutated = false;
      for (const [uid, rec] of peersRef.current) {
        if (!rec.analyser) continue;
        rec.analyser.getByteFrequencyData(buffer);
        const avg = averageEnergy(buffer);
        if (avg > SPEAKING_THRESHOLD) {
          rec.lastSpokeAt = now;
          mutated = true;
        }
        if (avg / 255 > SPEAKING_NORMALIZED_THRESHOLD) {
          nextSpeaking.add(uid);
        }
      }
      if (mutated) publishPeers();

      // Only update speakingUsers state when membership actually changed
      const prev = prevSpeakingSetRef.current;
      const changed =
        nextSpeaking.size !== prev.size ||
        [...nextSpeaking].some((id) => !prev.has(id));
      if (changed) {
        prevSpeakingSetRef.current = nextSpeaking;
        setSpeakingUsers(nextSpeaking);
      }

      speakingRafRef.current = requestAnimationFrame(tick);
    };

    speakingRafRef.current = requestAnimationFrame(tick);
  }, [publishPeers]);

  const stopSpeakingLoop = useCallback(() => {
    if (speakingRafRef.current !== null) {
      cancelAnimationFrame(speakingRafRef.current);
      speakingRafRef.current = null;
    }
    setSelfSpeaking(false);
    setLocalAudioLevel(0);
    prevSpeakingSetRef.current = new Set();
    setSpeakingUsers(new Set());
  }, []);

  // -------------------------------------------------------------------------
  // Peer connection lifecycle
  // -------------------------------------------------------------------------

  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      const ch = channelRef.current;
      if (!ch) return;
      ch.send({ type: "broadcast", event, payload }).catch((err) => {
        console.warn(`[useVoiceRoom] broadcast ${event} failed:`, err);
      });
    },
    [],
  );

  const teardownPeer = useCallback(
    (remoteId: string) => {
      const rec = peersRef.current.get(remoteId);
      if (!rec) return;

      try {
        rec.pc.ontrack = null;
        rec.pc.onicecandidate = null;
        rec.pc.onconnectionstatechange = null;
        rec.pc.close();
      } catch {
        /* already closed */
      }
      try {
        rec.audioEl.srcObject = null;
        rec.audioEl.remove();
      } catch {
        /* nothing to clean */
      }
      if (rec.audioCtx) {
        rec.audioCtx.close().catch(() => undefined);
      }

      peersRef.current.delete(remoteId);
      publishPeers();
    },
    [publishPeers],
  );

  const createPeer = useCallback(
    (
      remoteId: string,
      info: { name: string; avatarUrl: string | null },
    ): PeerRecord => {
      // Reuse if it already exists
      const existing = peersRef.current.get(remoteId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Attach local tracks
      const localStream = localStreamRef.current;
      if (localStream) {
        for (const track of localStream.getTracks()) {
          pc.addTrack(track, localStream);
        }
      }

      // Inbound track → hidden audio element + analyser for level meter
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.dataset.voicePeer = remoteId;
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);

      const rec: PeerRecord = {
        pc,
        audioEl,
        analyser: null,
        audioCtx: null,
        name: info.name,
        avatarUrl: info.avatarUrl,
        muted: false,
        lastSpokeAt: 0,
      };

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (!stream) return;
        audioEl.srcObject = stream;

        // Set up analyser for speaking indicator
        try {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (Ctx) {
            const ctx = new Ctx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            rec.analyser = analyser;
            rec.audioCtx = ctx;
          }
        } catch (err) {
          console.warn("[useVoiceRoom] analyser setup failed:", err);
        }
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        const me = userIdRef.current;
        if (!me) return;
        broadcast("voice:ice", {
          fromUserId: me,
          toUserId: remoteId,
          candidate: ev.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed" ||
          pc.connectionState === "disconnected"
        ) {
          teardownPeer(remoteId);
        }
      };

      peersRef.current.set(remoteId, rec);
      publishPeers();
      return rec;
    },
    [broadcast, publishPeers, teardownPeer],
  );

  const dialPeer = useCallback(
    async (
      remoteId: string,
      info: { name: string; avatarUrl: string | null },
    ) => {
      const me = userIdRef.current;
      if (!me) return;
      const rec = createPeer(remoteId, info);
      try {
        const offer = await rec.pc.createOffer();
        await rec.pc.setLocalDescription(offer);
        broadcast("voice:offer", {
          fromUserId: me,
          toUserId: remoteId,
          sdp: offer,
        });
      } catch (err) {
        console.error("[useVoiceRoom] offer failed for", remoteId, err);
        teardownPeer(remoteId);
      }
    },
    [broadcast, createPeer, teardownPeer],
  );

  // -------------------------------------------------------------------------
  // Public: leave
  // -------------------------------------------------------------------------

  const cleanup = useCallback(() => {
    stopSpeakingLoop();

    for (const remoteId of [...peersRef.current.keys()]) {
      teardownPeer(remoteId);
    }

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }

    if (selfAudioCtxRef.current) {
      selfAudioCtxRef.current.close().catch(() => undefined);
      selfAudioCtxRef.current = null;
    }
    selfAnalyserRef.current = null;

    if (channelRef.current) {
      const me = userIdRef.current;
      if (me) {
        channelRef.current
          .send({
            type: "broadcast",
            event: "voice:leave",
            payload: { userId: me } satisfies LeavePayload,
          })
          .catch(() => undefined);
      }
      supabase.removeChannel(channelRef.current).catch(() => undefined);
      channelRef.current = null;
    }
  }, [stopSpeakingLoop, teardownPeer]);

  const leave = useCallback(() => {
    cleanup();
    setJoined(false);
    setMuted(false);
    setPeers([]);
    setWarning(null);
    if (roomId) leaveVoiceRoom(roomId);
  }, [cleanup, roomId]);

  // -------------------------------------------------------------------------
  // Public: join
  // -------------------------------------------------------------------------

  const join = useCallback(async () => {
    if (joined || connecting) return;
    if (!userId) {
      setError("You must be signed in to join voice");
      return;
    }
    if (!roomId) return;

    setConnecting(true);
    setError(null);
    setWarning(null);

    let stream: MediaStream | null = null;

    try {
      // 1. Membership validation + roster
      const join = await joinVoiceRoom(roomId);
      if (join.warning) setWarning(join.warning);

      const existing: VoiceParticipantRow[] = (
        join.participants ?? []
      ).filter((p) => p.user_id !== userId);

      if (existing.length + 1 > maxParticipants) {
        setWarning(
          `Voice rooms support up to ${maxParticipants} participants — quality may degrade.`,
        );
      }

      // Pull display info for self from the roster (server already has it)
      const selfRow = (join.participants ?? []).find(
        (p) => p.user_id === userId,
      );
      if (selfRow) {
        profileRef.current = {
          name: selfRow.name,
          avatarUrl: selfRow.avatar_url,
        };
      }

      // 2. Mic permission
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      localStreamRef.current = stream;

      // Self speaking analyser
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          selfAudioCtxRef.current = ctx;
          selfAnalyserRef.current = analyser;
        }
      } catch (err) {
        console.warn("[useVoiceRoom] self analyser failed:", err);
      }

      // 3. Realtime channel
      const channel = supabase.channel(`voice-room-${roomId}`, {
        config: { broadcast: { self: false, ack: false } },
      });
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "voice:join" }, (msg) => {
          const data = msg.payload as JoinPayload;
          if (!data?.userId || data.userId === userIdRef.current) return;

          // Existing peer → newcomer dials us by sending an offer; we just
          // pre-register so we know the display info when the offer arrives.
          // Per spec the *connecting peer* initiates, so we do nothing here
          // beyond noting their presence. The offer handler will create the
          // peer record.
          createPeer(data.userId, {
            name: data.name,
            avatarUrl: data.avatarUrl,
          });
        })
        .on("broadcast", { event: "voice:leave" }, (msg) => {
          const data = msg.payload as LeavePayload;
          if (!data?.userId) return;
          teardownPeer(data.userId);
        })
        .on("broadcast", { event: "voice:offer" }, async (msg) => {
          const data = msg.payload as SdpPayload;
          if (!data || data.toUserId !== userIdRef.current) return;

          const rec = createPeer(data.fromUserId, {
            name: rosterLookup(existing, data.fromUserId)?.name ?? "Unknown",
            avatarUrl:
              rosterLookup(existing, data.fromUserId)?.avatar_url ?? null,
          });

          try {
            await rec.pc.setRemoteDescription(
              new RTCSessionDescription(data.sdp),
            );
            const answer = await rec.pc.createAnswer();
            await rec.pc.setLocalDescription(answer);
            broadcast("voice:answer", {
              fromUserId: userIdRef.current,
              toUserId: data.fromUserId,
              sdp: answer,
            });
          } catch (err) {
            console.error("[useVoiceRoom] offer handling failed:", err);
            teardownPeer(data.fromUserId);
          }
        })
        .on("broadcast", { event: "voice:answer" }, async (msg) => {
          const data = msg.payload as SdpPayload;
          if (!data || data.toUserId !== userIdRef.current) return;
          const rec = peersRef.current.get(data.fromUserId);
          if (!rec) return;
          try {
            await rec.pc.setRemoteDescription(
              new RTCSessionDescription(data.sdp),
            );
          } catch (err) {
            console.error("[useVoiceRoom] answer handling failed:", err);
          }
        })
        .on("broadcast", { event: "voice:ice" }, async (msg) => {
          const data = msg.payload as IcePayload;
          if (!data || data.toUserId !== userIdRef.current) return;
          const rec = peersRef.current.get(data.fromUserId);
          if (!rec) return;
          try {
            await rec.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.warn("[useVoiceRoom] ICE add failed:", err);
          }
        });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Realtime channel timed out")),
          10_000,
        );
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timeout);
            resolve();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            clearTimeout(timeout);
            reject(new Error(`Realtime channel ${status.toLowerCase()}`));
          }
        });
      });

      // 4. Announce ourselves
      broadcast("voice:join", {
        userId,
        name: profileRef.current.name,
        avatarUrl: profileRef.current.avatarUrl,
      });

      // 5. Dial each existing participant (per-spec: connecting peer initiates)
      for (const peer of existing) {
        await dialPeer(peer.user_id, {
          name: peer.name,
          avatarUrl: peer.avatar_url,
        });
      }

      startSpeakingLoop();
      setJoined(true);
    } catch (err) {
      console.error("[useVoiceRoom] join failed:", err);
      const message = describeJoinError(err);
      setError(message);

      // Tear down anything we partially set up
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
      }
      localStreamRef.current = null;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => undefined);
        channelRef.current = null;
      }
      leaveVoiceRoom(roomId);
    } finally {
      setConnecting(false);
    }
  }, [
    broadcast,
    connecting,
    createPeer,
    dialPeer,
    joined,
    maxParticipants,
    roomId,
    startSpeakingLoop,
    teardownPeer,
    userId,
  ]);

  // -------------------------------------------------------------------------
  // Mute
  // -------------------------------------------------------------------------

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !next;
    }
    setMuted(next);
  }, [muted]);

  // -------------------------------------------------------------------------
  // Cleanup on unmount or when disabled
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!enabled && joined) {
      leave();
    }
  }, [enabled, joined, leave]);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // intentionally empty: cleanup uses refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page unload — best-effort REST leave (Realtime channel teardown is async)
  useEffect(() => {
    if (!joined) return;
    const handler = () => {
      if (roomId) leaveVoiceRoom(roomId);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [joined, roomId]);

  return {
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
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function averageEnergy(buf: Uint8Array): number {
  if (buf.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i];
  return sum / buf.length;
}

function rosterLookup(
  roster: VoiceParticipantRow[],
  userId: string,
): VoiceParticipantRow | undefined {
  return roster.find((p) => p.user_id === userId);
}

function describeJoinError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Microphone access was denied. Enable it in your browser settings to join voice.";
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return "No microphone detected on this device.";
    }
    if (err.name === "NotReadableError") {
      return "Your microphone is being used by another application.";
    }
  }
  return err instanceof Error ? err.message : "Failed to join voice room";
}
