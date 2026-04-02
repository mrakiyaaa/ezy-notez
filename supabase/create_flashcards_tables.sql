-- ============================================================
-- Flashcard tables – stores AI-generated flashcard sets and cards
-- ============================================================

-- Flashcard sets table
CREATE TABLE IF NOT EXISTS flashcard_sets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL,
  user_id         UUID NOT NULL,
  title           TEXT NOT NULL DEFAULT 'Flashcard Set',
  source_ids      UUID[] NOT NULL DEFAULT '{}',
  card_count      INT NOT NULL DEFAULT 10,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_workspace
  ON flashcard_sets(workspace_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user
  ON flashcard_sets(user_id);

-- Individual flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id          UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  front           TEXT NOT NULL,
  back            TEXT NOT NULL,
  position        INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'unknown'
                    CHECK (status IN ('unknown', 'known', 'review')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_set
  ON flashcards(set_id);

CREATE INDEX IF NOT EXISTS idx_flashcards_position
  ON flashcards(set_id, position);
