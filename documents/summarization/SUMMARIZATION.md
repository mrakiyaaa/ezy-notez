# AI Summarization Feature

## Overview

EZY Notez provides AI-powered summarization of uploaded resources using a local Python model. The feature operates in two modes:

1. **General Summary** — Combines all workspace resources into one consolidated summary
2. **Customize** — Users select specific resources; each gets its own separate summary displayed in a tabbed view

Summaries are generated using [distilbart-cnn-12-6](https://huggingface.co/sshleifer/distilbart-cnn-12-6) (abstractive summarization) with an automatic fallback to [sumy LSA](https://github.com/miso-belica/sumy) (extractive summarization) for low-memory environments.

## Architecture

```
Frontend (Next.js)                    Backend (Express)                    Python Script
─────────────────                    ─────────────────                    ─────────────
User picks mode + format
  │
  ├─ POST /api/summaries/general     ─┐
  │  or                                │
  ├─ POST /api/summaries/custom      ─┘
  │         │
  │         ├─ Fetch resources' extracted_text from Supabase
  │         ├─ Insert summary row(s) with status = 'pending'
  │         ├─ Return pending row(s) immediately (201)
  │         │
  │         └─ Fire-and-forget pipeline:
  │               ├─ Set status = 'processing'
  │               ├─ spawn('python', ['summarize_text.py', format, chunkSize])
  │               │         │
  │               │         ├─ Read text from stdin
  │               │         ├─ Chunk by sentence boundaries
  │               │         ├─ Map: summarize each chunk (distilbart → sumy fallback)
  │               │         ├─ Reduce: if >3 chunks, summarize the summaries
  │               │         ├─ Format output (bullet/short/detailed)
  │               │         └─ Print to stdout
  │               │
  │               ├─ Sanitize output (strip null bytes)
  │               ├─ Save to summaries.content
  │               └─ Set status = 'ready' (or 'failed')
  │
  └─ Poll GET /api/summaries/workspace/:id every 3s
     └─ When all summaries ready → display results
```

## Two Modes

### General Summary
- Concatenates `extracted_text` from **all** ready resources in the workspace
- Produces a single summary with a collapsible "Sources Used" panel
- `resource_id` is `NULL` in the `summaries` table; `source_ids` tracks which resources were used

### Customize
- User selects specific resources via checkbox picker
- Each resource gets its own summary row (`resource_id` = that resource's ID)
- Results displayed in a tabbed view — one pill-shaped tab per resource

## Summary Formats

| Format | Description | Model Config |
|--------|-------------|-------------|
| **Bullet Points** | Concise bullet list | max_length=80, min_length=20 |
| **Short Paragraph** | Brief overview paragraph | max_length=150, min_length=40 |
| **Detailed** | Multi-paragraph in-depth summary | max_length=300, min_length=80 |

## Chunking & Map-Reduce Strategy

Large texts are split into chunks of ~1024 words at sentence boundaries:

1. **Map phase**: Each chunk is summarized independently
2. **Reduce phase**: If more than 3 chunk summaries, they are concatenated and summarized again
3. Safety cap: Inputs exceeding 50,000 words are rejected

## Model Fallback

The Python script tries distilbart first. If it fails (OOM, missing model, import error), it automatically falls back to sumy's LSA extractive summarizer. Both failures are logged to stderr.

## Database Schema

Table: `summaries`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Workspace this summary belongs to |
| `resource_id` | UUID (nullable) | NULL for general, set for per-resource |
| `user_id` | UUID | User who generated it |
| `format` | TEXT | `bullet`, `short`, or `detailed` |
| `content` | TEXT | The generated summary text |
| `source_ids` | UUID[] | Resource IDs used as input |
| `status` | TEXT | `pending`, `processing`, `ready`, `failed` |
| `error_message` | TEXT (nullable) | Error details if failed |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

Migration: `supabase/create_summaries_table.sql`

## API Endpoints

All under `/api/summaries`, require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/general` | Generate workspace-wide summary |
| POST | `/custom` | Generate per-resource summaries |
| GET | `/workspace/:workspaceId` | Get all summaries for workspace |
| GET | `/:id` | Get single summary |
| POST | `/:id/regenerate` | Re-generate a summary |
| DELETE | `/:id` | Delete a summary |

## Python Dependencies

Added to `requirements.txt`:
- `transformers` — HuggingFace model pipeline
- `torch` — PyTorch backend for distilbart
- `sentencepiece` — Tokenizer support
- `sumy` — Extractive summarization fallback
- `nltk` — NLP tokenization (used by sumy)

## Frontend Component

`SummarizationView.tsx` — Three-phase UI state machine:

1. **Configure**: Mode picker, resource selector (customize), format picker, generate button
2. **Processing**: Pulsing loader with progress counter, 3-second polling
3. **Results**: Summary card(s) with formatted content, tabs (customize mode), sources panel (general mode), re-summarize and delete buttons

## Key Files

| File | Purpose |
|------|---------|
| `backend/scripts/summarize_text.py` | Python summarization engine |
| `backend/src/services/summary.service.ts` | Business logic & pipeline |
| `backend/src/controllers/summary.controller.ts` | HTTP handlers |
| `backend/src/routes/summary.routes.ts` | Route definitions |
| `frontend/src/components/workspace/SummarizationView.tsx` | UI component |
| `frontend/src/services/summary.service.ts` | Frontend API service |
| `frontend/src/types/summary.ts` | TypeScript types |
| `supabase/create_summaries_table.sql` | Database migration |

## Re-summarize

The "Re-summarize" button calls `POST /api/summaries/:id/regenerate`, which:
1. Fetches the original source text (from `resource_id` or `source_ids`)
2. Resets the row to `pending`
3. Re-runs the summarization pipeline
4. Optionally accepts a new format

## Known Limitations

- **First run**: distilbart model download (~500MB) makes the first summarization slow
- **RAM**: distilbart requires ~1.2GB RAM; falls back to sumy on low-memory environments
- **Processing time**: 10-60 seconds depending on text size (handled via async polling)
- **Concurrency**: No built-in limit on concurrent summarization processes
