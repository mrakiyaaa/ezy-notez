-- ============================================================
-- Migration: add 'dismissed' status to study_room_invites
-- and add RLS SELECT policy so invited users can see their
-- own invites (required for Realtime change events to work).
-- ============================================================

-- 1. Drop the existing CHECK constraint and recreate it with 'dismissed' included.
--    Supabase doesn't support ALTER CONSTRAINT, so we drop + re-add.

ALTER TABLE study_room_invites
  DROP CONSTRAINT IF EXISTS study_room_invites_status_check;

ALTER TABLE study_room_invites
  ADD CONSTRAINT study_room_invites_status_check
  CHECK (status IN ('pending', 'accepted', 'dismissed'));

-- 2. Add an RLS SELECT policy that lets the invited user see their own invites.
--    This is required so that Supabase Realtime postgres_changes events are
--    delivered to the invited user's browser session.

CREATE POLICY study_room_invites_select_invited ON study_room_invites
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));
