import { supabaseAdmin } from "../config/supabase";
import { ForbiddenError, NotFoundError } from "./studyRoom.service";

// ---------------------------------------------------------------------------
// In-memory registry of active voice participants per room.
// WebRTC is fully P2P; this map exists only as a discovery hint so a newly
// joining peer knows who to send offers to. Disconnect cleanup is best-effort
// — the client calls registerLeave on unmount; stale entries will time out.
// ---------------------------------------------------------------------------

const STALE_AFTER_MS = 60_000;
const MAX_VOICE_PARTICIPANTS = 6;

type VoiceEntry = {
  userId: string;
  joinedAt: number;
};

const activeByRoom = new Map<string, Map<string, VoiceEntry>>();

const pruneStale = (roomId: string): void => {
  const room = activeByRoom.get(roomId);
  if (!room) return;
  const cutoff = Date.now() - STALE_AFTER_MS;
  for (const [uid, entry] of room) {
    if (entry.joinedAt < cutoff) room.delete(uid);
  }
  if (room.size === 0) activeByRoom.delete(roomId);
};

export interface VoiceParticipant {
  user_id: string;
  name: string;
  avatar_url: string | null;
  joined_at: number;
}

// ---------------------------------------------------------------------------
// Membership validation — confirms the user belongs to the room and the room
// itself exists. Used as a guard before allowing the client to join voice.
// ---------------------------------------------------------------------------

export const ensureRoomMember = async (
  userId: string,
  roomId: string,
): Promise<void> => {
  const { data: room, error: roomErr } = await supabaseAdmin
    .from("study_rooms")
    .select("id, host_id")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) throw new NotFoundError("Room not found");

  if (room.host_id === userId) return;

  const { data: participant } = await supabaseAdmin
    .from("study_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) {
    throw new ForbiddenError("You are not a member of this room");
  }
};

// ---------------------------------------------------------------------------
// Active voice participants
// ---------------------------------------------------------------------------

const enrichParticipants = async (
  entries: VoiceEntry[],
): Promise<VoiceParticipant[]> => {
  if (entries.length === 0) return [];

  const userIds = entries.map((e) => e.userId);
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map(
      (p: { id: string; full_name: string | null; avatar_url: string | null }) => [
        p.id,
        { name: p.full_name ?? "Unknown", avatar_url: p.avatar_url ?? null },
      ],
    ),
  );

  return entries.map((e) => ({
    user_id: e.userId,
    name: profileMap.get(e.userId)?.name ?? "Unknown",
    avatar_url: profileMap.get(e.userId)?.avatar_url ?? null,
    joined_at: e.joinedAt,
  }));
};

export const getActiveVoiceParticipants = async (
  roomId: string,
): Promise<VoiceParticipant[]> => {
  pruneStale(roomId);
  const room = activeByRoom.get(roomId);
  if (!room) return [];
  return enrichParticipants([...room.values()]);
};

export interface VoiceJoinResult {
  participants: VoiceParticipant[];
  warning: string | null;
}

export const registerVoiceJoin = async (
  userId: string,
  roomId: string,
): Promise<VoiceJoinResult> => {
  await ensureRoomMember(userId, roomId);
  pruneStale(roomId);

  let room = activeByRoom.get(roomId);
  if (!room) {
    room = new Map();
    activeByRoom.set(roomId, room);
  }

  const existingCount = room.has(userId) ? room.size : room.size + 1;
  const warning =
    existingCount > MAX_VOICE_PARTICIPANTS
      ? `Voice rooms support up to ${MAX_VOICE_PARTICIPANTS} participants — quality may degrade.`
      : null;

  room.set(userId, { userId, joinedAt: Date.now() });

  const participants = await enrichParticipants([...room.values()]);
  return { participants, warning };
};

export const registerVoiceLeave = (userId: string, roomId: string): void => {
  const room = activeByRoom.get(roomId);
  if (!room) return;
  room.delete(userId);
  if (room.size === 0) activeByRoom.delete(roomId);
};

export const VOICE_MAX_PARTICIPANTS = MAX_VOICE_PARTICIPANTS;
