-- ============================================================
-- Migration: enable Supabase Realtime for study_room_participants
-- ============================================================
-- Required so that postgres_changes INSERT events on this table
-- are delivered to the frontend (lobby participant list and landing
-- active-invitations panel). REPLICA IDENTITY FULL ensures all
-- column values are present in WAL records, so filters on non-PK
-- columns (e.g. room_id, user_id) work correctly for UPDATE events.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_participants;

ALTER TABLE public.study_room_participants REPLICA IDENTITY FULL;
