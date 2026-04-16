-- ============================================================
-- Study Room tables – multiplayer quiz-style study sessions
-- ============================================================

-- study_rooms: top-level room metadata
CREATE TABLE IF NOT EXISTS study_rooms (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  host_id         UUID NOT NULL REFERENCES auth.users(id),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'in_progress', 'completed')),
  invite_method   TEXT NOT NULL
                    CHECK (invite_method IN ('otp', 'email')),
  otp_code        TEXT,
  otp_expires_at          TIMESTAMPTZ,
  question_count          INTEGER NOT NULL DEFAULT 20,
  resource_ids            TEXT[] NOT NULL DEFAULT '{}',
  current_question_order  INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_rooms_workspace
  ON study_rooms(workspace_id);

CREATE INDEX IF NOT EXISTS idx_study_rooms_host
  ON study_rooms(host_id);

-- study_room_participants: users who have joined a room
CREATE TABLE IF NOT EXISTS study_room_participants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id     UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  is_host     BOOLEAN NOT NULL DEFAULT false,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_room_participants_room
  ON study_room_participants(room_id);

CREATE INDEX IF NOT EXISTS idx_study_room_participants_user
  ON study_room_participants(user_id);

-- study_room_invites: email-based invitations
CREATE TABLE IF NOT EXISTS study_room_invites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id     UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- study_room_questions: AI-generated questions for the session
CREATE TABLE IF NOT EXISTS study_room_questions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id         UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  options         JSONB NOT NULL,
  correct_answer  TEXT NOT NULL,
  explanation     TEXT NOT NULL,
  order_index     INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- study_room_answers: each participant's answer to each question
CREATE TABLE IF NOT EXISTS study_room_answers (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id          UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES study_room_questions(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  selected_answer  TEXT NOT NULL,
  is_correct       BOOLEAN NOT NULL,
  points_earned    INTEGER NOT NULL DEFAULT 0,
  answered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_room_answers_room_question
  ON study_room_answers(room_id, question_id);

-- used_questions: tracks question hashes to avoid repeating questions per workspace
CREATE TABLE IF NOT EXISTS used_questions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, question_hash)
);

CREATE INDEX IF NOT EXISTS idx_used_questions_workspace
  ON used_questions(workspace_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE study_rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_invites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_answers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_questions           ENABLE ROW LEVEL SECURITY;

-- ── study_rooms ──────────────────────────────────────────────

-- Host or participant can read
CREATE POLICY study_rooms_select ON study_rooms
  FOR SELECT TO authenticated
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM study_room_participants
      WHERE room_id = study_rooms.id
        AND user_id = auth.uid()
    )
  );

-- Any authenticated user can create a room
CREATE POLICY study_rooms_insert ON study_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Only the host can update room state
CREATE POLICY study_rooms_update ON study_rooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);

-- ── study_room_participants ───────────────────────────────────

-- Participants of the same room can see each other
CREATE POLICY study_room_participants_select ON study_room_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_room_participants AS srp
      WHERE srp.room_id = study_room_participants.room_id
        AND srp.user_id = auth.uid()
    )
  );

-- Any authenticated user can join (insert their own row)
CREATE POLICY study_room_participants_insert ON study_room_participants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── study_room_invites ────────────────────────────────────────

-- Only the host of the room can see its invites
CREATE POLICY study_room_invites_select ON study_room_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = study_room_invites.room_id
        AND host_id = auth.uid()
    )
  );

-- Only the host can create invites
CREATE POLICY study_room_invites_insert ON study_room_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = study_room_invites.room_id
        AND host_id = auth.uid()
    )
  );

-- Any authenticated user can accept an invite (update status)
CREATE POLICY study_room_invites_update ON study_room_invites
  FOR UPDATE TO authenticated
  USING (true);

-- ── study_room_questions ──────────────────────────────────────

-- Participants of the room can read questions
CREATE POLICY study_room_questions_select ON study_room_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_room_participants
      WHERE room_id = study_room_questions.room_id
        AND user_id = auth.uid()
    )
  );

-- Only the host can insert questions
CREATE POLICY study_room_questions_insert ON study_room_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = study_room_questions.room_id
        AND host_id = auth.uid()
    )
  );

-- ── study_room_answers ────────────────────────────────────────

-- Participants of the room can read all answers in that room
CREATE POLICY study_room_answers_select ON study_room_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_room_participants
      WHERE room_id = study_room_answers.room_id
        AND user_id = auth.uid()
    )
  );

-- Users can only insert their own answers
CREATE POLICY study_room_answers_insert ON study_room_answers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── used_questions ────────────────────────────────────────────

-- User can read used_questions for workspaces they own
CREATE POLICY used_questions_select ON used_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = used_questions.workspace_id
        AND user_id = auth.uid()
    )
  );

-- Any authenticated user can insert (workspace ownership enforced by app layer)
CREATE POLICY used_questions_insert ON used_questions
  FOR INSERT TO authenticated
  WITH CHECK (true);
