# Study Room Realtime — Participant Join Fix

## Problem

Several user actions required a page refresh even though Supabase Realtime was active:

- **Host's lobby** didn't see a friend join via OTP or email-invite accept if the backend broadcast was dropped.
- **Landing page** participant counts and active-invitations panel never updated when a friend joined a room (no listener on `study_room_participants`).
- **Quiz component** could get stuck on a stale question if a `question:next` broadcast fired during the mount-window race (subscription established after initial fetch).

## Root Causes

### 1. Fragile fire-and-forget broadcast

`backend/src/services/studyRoomRealtime.service.ts` created a fresh channel per event, called `.send()` without `ack: true`, then tore down the channel in `.finally()`. Because `ack: false` (default) resolves the send promise before WS delivery is confirmed, the channel could be removed before the message reached subscribers.

### 2. No postgres_changes fallback on `study_room_participants`

The lobby relied entirely on the broadcast `participant:joined`. If the broadcast was dropped, no DB-level event covered the gap. The landing page had no listener at all for this table.

### 3. Quiz missing a SUBSCRIBED resync

The lobby had a resync on SUBSCRIBED that re-fetched participants and checked room status. The quiz did not, so a `question:next` or `room:ended` event missed during the mount window left the client stuck until they refreshed.

### 4. `study_room_participants` not in Realtime publication

The table was missing from `supabase_realtime` publication and had `REPLICA IDENTITY DEFAULT`, so postgres_changes events were never emitted for it.

## Fixes

### Fix A — Backend broadcast reliability
**File:** `backend/src/services/studyRoomRealtime.service.ts`

- Added `{ config: { broadcast: { ack: true } } }` to the per-event channel.
- Added a 5 s `setTimeout` fallback that removes the channel if subscribe never reaches `SUBSCRIBED` (guards against channel leaks).
- Channel is now only torn down after the server has acknowledged delivery.

### Fix B — Lobby: postgres_changes fallback on `study_room_participants`
**File:** `frontend/src/components/study-room/StudyRoomLobby.tsx`

- Added `.on("postgres_changes", { event: "INSERT", table: "study_room_participants", filter: "room_id=eq.{roomId}" })` to the existing `study-room:{roomId}` channel.
- Handler re-fetches `getLobbyParticipants` and splices only truly new entries (de-dup by `user_id`), so it's idempotent when both the broadcast and the DB event fire.

### Fix C — Quiz: SUBSCRIBED resync
**File:** `frontend/src/components/study-room/StudyRoomQuiz.tsx`

- Added a `currentQuestionIdRef` updated on every question change to give the subscribe callback a non-stale ID reference.
- On `SUBSCRIBED`, calls `getCurrentQuestion(room.id)`. If the returned question ID differs, dispatches `SET_QUESTION`. If the API throws because the room is now `completed`, calls `goToResults()`.

### Fix D — Landing: postgres_changes on `study_room_participants` for current user
**File:** `frontend/src/components/study-room/StudyRoomLanding.tsx`

- New `useEffect` subscribing channel `landing-participants:{userId}` to postgres_changes INSERT on `study_room_participants` filtered by `user_id=eq.${userId}`.
- On INSERT, a 300 ms debounced full refetch updates recent rooms, hosted rooms, stats, and pending invites.

### Fix E — Database migration
**File:** `supabase/alter_study_room_participants_realtime.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_participants;
ALTER TABLE public.study_room_participants REPLICA IDENTITY FULL;
```

## Verification

```sql
-- REPLICA IDENTITY is FULL
SELECT relname, CASE relreplident WHEN 'f' THEN 'FULL' END AS replica_identity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'study_room_participants';
-- → { relname: 'study_room_participants', replica_identity: 'FULL' }

-- Table is in supabase_realtime publication
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'study_room_participants';
-- → { tablename: 'study_room_participants' }
```

## Files Modified

| File | Change |
|---|---|
| `backend/src/services/studyRoomRealtime.service.ts` | `send()` helper — ack:true + 5 s timeout |
| `frontend/src/components/study-room/StudyRoomLobby.tsx` | postgres_changes INSERT on `study_room_participants` |
| `frontend/src/components/study-room/StudyRoomQuiz.tsx` | SUBSCRIBED resync of current question + currentQuestionIdRef |
| `frontend/src/components/study-room/StudyRoomLanding.tsx` | `landing-participants:{userId}` channel + debounced refetch |
| `supabase/alter_study_room_participants_realtime.sql` | New migration |

## What Was NOT Changed

- Voice/WebRTC (`useVoiceRoom.ts`, `voiceRoom.controller.ts`, `voice-room-{roomId}` channel)
- Quiz/question-generation pipeline (`generateRoomQuestions`, `generateInsights`, FastAPI ML service)
- Previously applied `study_room_invites` RLS + REPLICA IDENTITY fix
- All other unrelated features
