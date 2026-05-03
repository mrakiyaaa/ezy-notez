# Study Room Realtime Fix

## Problem

Invite panels (Hub page and Study Room Landing) and room list/stats (Study Room Landing) did not update in real-time — a manual browser refresh was required after data changed.

Postgres changes subscriptions had been added for `study_room_invites` and `study_rooms`, and both tables were in `supabase_realtime` publication, but events were still not reaching clients.

## Root Causes

### 1. RLS SELECT policy blocked invitees from receiving events

`study_room_invites` had a single SELECT policy:

```sql
-- Only the host could SELECT invite rows
USING (EXISTS (
  SELECT 1 FROM study_rooms
  WHERE study_rooms.id = study_room_invites.room_id
    AND study_rooms.host_id = auth.uid()
))
```

When Supabase Realtime fires a `postgres_changes` event, it runs an RLS SELECT check server-side using the subscriber's JWT **before** delivering the event. Because the invitee is not the host, `auth.uid()` does not match `host_id`, the check fails, and the event is silently dropped. No invite events ever reached the invitee's client.

### 2. REPLICA IDENTITY DEFAULT blocked UPDATE event filters on non-PK columns

Both tables had `REPLICA IDENTITY DEFAULT` (`relreplident = 'd'`). With this setting, WAL records for UPDATE events only include the primary key (`id`) in the old row — all other columns are absent from the old record.

Supabase Realtime applies `postgres_changes` filters against **both** the old and new WAL records. Since the filter columns are non-PK:

- `email` on `study_room_invites` — absent from old record → UPDATE filter fails
- `workspace_id` on `study_rooms` — absent from old record → UPDATE filter fails

Every UPDATE event was silently rejected even when RLS would have passed.

## Fix Applied

Migration: `fix_realtime_rls_and_replica_identity`

```sql
-- Allow invitees to SELECT their own invite rows so Realtime can deliver events
CREATE POLICY "study_room_invites_select_invitee"
  ON public.study_room_invites
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Set REPLICA IDENTITY FULL so all columns are present in WAL old records,
-- enabling UPDATE event filters on non-PK columns to work correctly
ALTER TABLE public.study_room_invites REPLICA IDENTITY FULL;
ALTER TABLE public.study_rooms REPLICA IDENTITY FULL;
```

## Affected Files

No frontend changes were required — the existing subscription code in these files was structurally correct and works once the database issues are resolved:

- `frontend/src/app/(dashboard)/workspaces/page.tsx` — Hub invite panel
- `frontend/src/components/study-room/StudyRoomLanding.tsx` — Study Room invite panel + room list/stats

## Verification

```sql
-- Policy exists
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'study_room_invites'
  AND policyname = 'study_room_invites_select_invitee';
-- → returns row with qual: (email = (auth.jwt() ->> 'email'))

-- REPLICA IDENTITY is FULL on both tables
SELECT relname, relreplident FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('study_room_invites', 'study_rooms');
-- → both rows show relreplident = 'f'
```
