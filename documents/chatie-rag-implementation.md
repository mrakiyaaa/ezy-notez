# Chatie — RAG Chatbot Implementation

## Overview

Chatie is a Retrieval-Augmented Generation (RAG) chatbot that lets students ask questions about their uploaded workspace resources. It uses Gemini embeddings for semantic search and Gemini Flash for answer generation.

## Architecture

```
Frontend (Chattie.tsx)
      │
      ▼
Express proxy routes  /api/chatie/*
      │
      ▼
FastAPI Chatie ML service (port 8002)
  ├── POST /embed-resource  → chunk + embed via Gemini text-embedding-004
  ├── POST /chat            → RAG: embed query → pgvector search → Gemini 2.0 Flash
  ├── GET  /chat-history    → fetch conversation history
  └── DELETE /chat-history  → clear conversation history
      │
      ▼
Supabase PostgreSQL
  ├── resource_embeddings (pgvector, ivfflat index, cosine similarity)
  └── chat_history (user + assistant messages with source references)
```

## Database Schema

### resource_embeddings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| workspace_id | uuid | FK → workspaces |
| resource_id | uuid | FK → resources (cascade delete) |
| chunk_index | integer | Position within resource |
| chunk_text | text | The raw chunk content |
| embedding | vector(768) | Gemini text-embedding-004 output |
| created_at | timestamptz | Auto-set |

### chat_history
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| workspace_id | uuid | FK → workspaces |
| user_id | uuid | From auth |
| role | text | "user" or "assistant" |
| content | text | Message text |
| sources | jsonb | Array of {resource_id, chunk_text} for assistant msgs |
| created_at | timestamptz | Auto-set |

### RPC Function: match_resource_embeddings
- pgvector cosine similarity search
- Filters by workspace_id and optional resource_ids array
- Returns top N chunks with similarity scores

## Embedding Pipeline

1. Resource reaches `ready` status in `runExtractionPipeline`
2. Fire-and-forget call to Chatie ML `/embed-resource`
3. Text is chunked into ~500 token segments with 50 token overlap
4. Gemini `text-embedding-004` generates 768-dim embeddings
5. Old embeddings for that resource_id are deleted, new ones inserted

## RAG Chat Flow

1. User sends message with selected resource_ids
2. User message is embedded with `text-embedding-004` (RETRIEVAL_QUERY task type)
3. pgvector cosine similarity finds top 5 matching chunks
4. System prompt + retrieved context + user message sent to `gemini-2.0-flash`
5. Both user message and assistant response saved to chat_history
6. Response returned with source references

## Environment Variables

### Chatie ML Service (services/chatie-ml/.env)
| Variable | Required | Description |
|----------|----------|-------------|
| GEMINI_API_KEY | Yes | Google AI API key for embeddings + generation |
| SUPABASE_URL | Yes | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Service role key (bypasses RLS) |
| CHATIE_PORT | No | Default 8002 |

### Express Backend (backend/.env)
| Variable | Required | Description |
|----------|----------|-------------|
| CHATIE_ML_SERVICE_URL | No | Default http://localhost:8002 |

## Starting the Service

```bash
cd services/chatie-ml
pip install -r requirements.txt
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## Frontend Features

- Resource selector with checkboxes (all selected by default)
- Chat interface with user/assistant message bubbles
- Source reference pills below assistant messages (showing resource names)
- Cycling loading keywords during response generation (1.5s interval)
- Clear history with confirmation step
- Suggestion chips for first-time users
- Markdown rendering for assistant responses
- Dark glassmorphism design matching existing features

## Files Created/Modified

### Created
- `services/chatie-ml/` — Complete FastAPI microservice
  - `main.py` — Endpoints
  - `models.py` — Pydantic models
  - `db.py` — Supabase client
  - `embeddings.py` — Chunking + Gemini embedding utilities
  - `requirements.txt` — Python dependencies
  - `.env.example` — Environment template
- `backend/src/routes/chatie.routes.ts` — Express proxy routes
- `backend/src/controllers/chatie.controller.ts` — Express handlers
- `frontend/src/types/chatie.ts` — TypeScript types
- `frontend/src/services/chatie.service.ts` — API client functions
- SQL migrations for resource_embeddings + chat_history tables + RPC function

### Modified
- `backend/src/server.ts` — Registered `/api/chatie` routes
- `backend/src/services/resource.service.ts` — Added auto-embed trigger after extraction
- `frontend/src/components/workspace/Chattie.tsx` — Replaced mock with real RAG chat
