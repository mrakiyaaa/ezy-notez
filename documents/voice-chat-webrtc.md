# Voice Chat (WebRTC) for Study Rooms

## Overview

Real-time peer-to-peer voice communication for participants of a study room.
Audio streams flow directly between browsers via WebRTC; the backend never
touches media. Supabase Realtime is used as the signaling layer.

- **Topology:** mesh P2P (every peer is connected to every other peer)
- **ICE servers:** STUN only — `stun:stun.l.google.com:19302`
- **Max participants:** 6 (warning shown beyond this; connections still work)
- **No recording** is performed
- **Signaling channel name:** `voice-room-{roomId}` (Supabase Realtime broadcast)

## Files

### Backend

| File | Purpose |
|---|---|
| `backend/src/services/voiceRoom.service.ts` | In-memory active-participant registry + DB membership check |
| `backend/src/controllers/voiceRoom.controller.ts` | REST handlers for join / leave / list participants |
| `backend/src/routes/studyRoom.routes.ts` | Voice routes mounted under `/api/study-rooms/:roomId/voice/*` |

### Frontend

| File | Purpose |
|---|---|
| `frontend/src/hooks/useVoiceRoom.ts` | Encapsulates getUserMedia, RTCPeerConnection mesh, signaling, mute, AnalyserNode-based speaking detection, cleanup |
| `frontend/src/components/workspace/study-room/VoicePanel.tsx` | UI: Join/Leave button, mute toggle, participant list with mic/speaking indicators |
| `frontend/src/services/studyRoom.service.ts` | Adds `joinVoiceRoom`, `leaveVoiceRoom`, `getVoiceParticipants` REST helpers |
| `frontend/src/types/studyRoom.ts` | Adds `VoiceParticipantRow` and `VoiceJoinResponse` types |
| `frontend/src/components/workspace/StudyRoomLobby.tsx` | Renders `<VoicePanel>` between OTP card and Participants card |

## REST endpoints

All routes are protected by `authenticateUser`. Base path:
`/api/study-rooms/:roomId/voice`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/participants` | Active voice participants (membership-checked) |
| `POST` | `/join` | Validate room membership, register active presence, return existing roster + `max_participants` + optional warning |
| `POST` | `/leave` | Remove caller from active registry (best-effort cleanup) |

### Membership validation

`ensureRoomMember(userId, roomId)` is called by `/join` and `/participants`.
A user is a member if they are the host **or** appear in `study_room_participants`
for that room. Non-members get `403 Forbidden`. Missing rooms get `404`.

### Active-participant registry

Held in process memory (`Map<roomId, Map<userId, VoiceEntry>>`). Stale entries
are pruned after 60 s. On `POST /leave`, the caller is removed immediately. The
registry is **only a discovery hint** so a newly joining peer knows whom to
dial — it is not authoritative for media routing.

## Signaling protocol (Supabase Realtime)

Channel: `voice-room-{roomId}` (broadcast). The newcomer initiates.

| Event | Payload | Sent by | Reaction |
|---|---|---|---|
| `voice:join` | `{ userId, name, avatarUrl }` | Newcomer, after `/voice/join` returns | Existing peers pre-register the user (display info ready for the offer) |
| `voice:leave` | `{ userId }` | Departing peer | Receivers tear down that PC |
| `voice:offer` | `{ fromUserId, toUserId, sdp }` | Newcomer → existing peer | Receiver sets remote description, replies with `voice:answer` |
| `voice:answer` | `{ fromUserId, toUserId, sdp }` | Existing peer → newcomer | Newcomer sets remote description |
| `voice:ice` | `{ fromUserId, toUserId, candidate }` | Both directions, throughout the call | Receiver adds ICE candidate |

Filtering is done in handlers by checking `toUserId === self`. Broadcast
self-receive is disabled (`config: { broadcast: { self: false } }`).

## Hook: `useVoiceRoom`

```ts
const {
  joined, connecting, muted, error, warning,
  peers, selfSpeaking, maxParticipants,
  join, leave, toggleMute,
} = useVoiceRoom({ roomId, userId, maxParticipants: 6 });
```

### Lifecycle (`join()`)

1. POST `/voice/join` — validates membership, returns existing roster +
   warning if over capacity.
2. `navigator.mediaDevices.getUserMedia({ audio })` — mic permission. Denial
   produces a friendly error (`error` state).
3. Build self `AnalyserNode` for the local speaking indicator.
4. Subscribe to Supabase channel `voice-room-{roomId}`. Wait for `SUBSCRIBED`
   (10 s timeout).
5. Broadcast `voice:join`.
6. For each existing peer in the roster: create `RTCPeerConnection`, add local
   tracks, create offer, send `voice:offer`.
7. Start single `requestAnimationFrame` loop polling all analysers; mark
   `speaking: true` for any peer whose energy crosses `SPEAKING_THRESHOLD`.

### Lifecycle (`leave()` / unmount)

- Stop rAF loop
- Close every `RTCPeerConnection` and remove its hidden `<audio>` element
- Stop all local mic tracks
- Close `AudioContext`s
- Broadcast `voice:leave` and remove the Supabase channel
- POST `/voice/leave` (also wired to `beforeunload` while joined)

### Mute

`toggleMute` flips the `enabled` flag on every local audio track. No
renegotiation is required — the remote peer's stream still has the track,
just silent. The local analyser still runs, but `selfSpeaking` is gated by
`!muted` in the panel.

### Internal state separation

Peer connections, audio elements, analysers, audio contexts, and the local
stream all live in `useRef` `Map`s. Only the lightweight `VoicePeerState[]`
projection is mirrored into React state via `publishPeers()`, called on
peer add/remove and whenever the rAF loop sees a speaking transition.

## UI: `VoicePanel`

- **Idle:** "Join Voice" button (blue-accent style). Disabled while
  `connecting` or when `currentUserId` is missing.
- **Joined:** mute toggle + leave button. Participant list with avatar,
  name, mic icon (filled when active, struck through when muted), animated
  3-bar speaking indicator when `speaking && !muted`.
- **Errors:** mic-permission denial, no device, device in use, channel
  failures — all rendered in a red banner above the list.
- **Capacity warning:** rendered in an amber banner if the server flagged
  the room as over capacity, or if local count exceeds `maxParticipants`.
- Tokens used: `bg-bg-card`, `border-fade-border`, `text-text-primary`,
  `text-text-secondary`, `text-text-muted`, `text-blue-accent`,
  `bg-blue-accent/15`, `border-blue-accent/30`. Existing aura/glow styling on
  surrounding components is left untouched.

## Integration

`StudyRoomLobby.tsx` renders `<VoicePanel>` between the OTP card and the
Participants card whenever the user's auth ID has resolved. The host
"Start Room" flow is unaffected; voice can be used before, during, and
after the quiz starts (the lobby only renders before — to extend voice
into the quiz screen, drop the same `<VoicePanel>` into `StudyRoomQuiz`).

## Constraints / known limitations

- **Mesh topology** — connection count grows quadratically. Practical cap
  is 6 participants (each peer holds 5 connections). Beyond this, switch to
  an SFU.
- **STUN-only** — peers behind symmetric NAT may fail to connect. Adding a
  TURN server would fix this but is out of scope.
- **Stale-entry pruning is per-process** — if the backend runs multiple
  instances, the active list is per-instance. The list is only a discovery
  hint; missed entries surface via `voice:join` broadcasts when the peer
  rejoins.
- **No voice recording** — by design.
