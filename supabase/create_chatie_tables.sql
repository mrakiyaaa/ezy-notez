-- Chatie RAG Tables
-- Stores vector embeddings for workspace resources and per-user chat history.
-- Requires the pgvector extension (already enabled as extensions.vector).

-- resource_embeddings: chunked text + 768-dim Gemini embeddings for RAG retrieval
CREATE TABLE IF NOT EXISTS resource_embeddings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  resource_id   UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  embedding     extensions.vector(768),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_workspace
  ON resource_embeddings(workspace_id);

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_resource
  ON resource_embeddings(resource_id);

-- ivfflat index for fast cosine similarity search
-- lists=100 is a reasonable default; tune after the table has >10k rows
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_cosine
  ON resource_embeddings
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- chat_history: per-user conversation history, keyed by workspace
CREATE TABLE IF NOT EXISTS chat_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  user_id       UUID NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  sources       JSONB,  -- [{resource_id, chunk_text}, ...] for assistant messages
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_workspace_user
  ON chat_history(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_created
  ON chat_history(workspace_id, user_id, created_at);

-- RPC function: cosine similarity search against resource_embeddings
-- Accepts an optional resource_ids filter; pass '{}' to search all resources
-- in the workspace.
CREATE OR REPLACE FUNCTION match_resource_embeddings(
  query_embedding     extensions.vector,
  filter_workspace_id UUID,
  filter_resource_ids UUID[]  DEFAULT '{}',
  match_count         INTEGER DEFAULT 5
)
RETURNS TABLE (
  id            UUID,
  resource_id   UUID,
  chunk_index   INTEGER,
  chunk_text    TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.resource_id,
    re.chunk_index,
    re.chunk_text,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM resource_embeddings re
  WHERE re.workspace_id = filter_workspace_id
    AND (
      array_length(filter_resource_ids, 1) IS NULL
      OR re.resource_id = ANY(filter_resource_ids)
    )
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
