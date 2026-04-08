-- Quiz Generator Tables
-- Following the same conventions as create_flashcards_tables.sql

-- quizzes: top-level quiz metadata
CREATE TABLE IF NOT EXISTS quizzes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL,
  user_id         UUID NOT NULL,
  title           TEXT NOT NULL DEFAULT 'Quiz',
  source_ids      UUID[] NOT NULL DEFAULT '{}',
  question_type   TEXT NOT NULL DEFAULT 'mcq'
                    CHECK (question_type IN ('mcq', 'scenario', 'mixed')),
  question_count  INT NOT NULL DEFAULT 10,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_workspace
  ON quizzes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_user
  ON quizzes(user_id);

-- quiz_questions: individual questions belonging to a quiz
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id           UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text     TEXT NOT NULL,
  question_type     TEXT NOT NULL CHECK (question_type IN ('mcq', 'scenario')),
  options           JSONB NOT NULL DEFAULT '[]',
  correct_option_id TEXT NOT NULL,
  explanation       TEXT NOT NULL DEFAULT '',
  topic_tag         TEXT NOT NULL DEFAULT '',
  position          INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz
  ON quiz_questions(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_position
  ON quiz_questions(quiz_id, position);

-- quiz_attempts: a user's attempt at completing a quiz
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id         UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed')),
  answers         JSONB NOT NULL DEFAULT '[]',
  score           INT,
  total           INT,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz
  ON quiz_attempts(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user
  ON quiz_attempts(user_id);
