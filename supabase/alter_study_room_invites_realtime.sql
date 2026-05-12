-- Add study_room_invites to the Supabase Realtime publication so that
-- postgres_changes events are delivered to invited users in real time.
-- REPLICA IDENTITY FULL is required for row-level filters (email=eq.*)
-- to evaluate correctly on UPDATE and DELETE events, because the WAL
-- only includes the primary key by default.

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_invites;
ALTER TABLE public.study_room_invites REPLICA IDENTITY FULL;
