-- ============================================================
-- Summaries table – stores AI-generated summaries
-- ============================================================
-- resource_id = NULL  → general (workspace-wide) summary
-- resource_id = <uuid> → per-resource summary (customize mode)

CREATE TABLE IF NOT EXISTS summaries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  resource_id   UUID REFERENCES resources(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  format        TEXT NOT NULL CHECK (format IN ('bullet', 'short', 'detailed')),
  content       TEXT NOT NULL DEFAULT '',
  source_ids    UUID[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summaries_workspace
  ON summaries(workspace_id);

CREATE INDEX IF NOT EXISTS idx_summaries_resource
  ON summaries(resource_id)
  WHERE resource_id IS NOT NULL;
