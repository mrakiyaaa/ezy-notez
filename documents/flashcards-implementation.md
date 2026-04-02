# Flashcard Generation Feature – Implementation Documentation

## Overview

AI-powered flashcard generation using local FLAN-T5 model. Users select workspace resources, optionally set a topic focus and card count, then generate study flashcards. Progress (known/review status) persists to the database.

## Status: Complete ✓

### Prerequisites

**IMPORTANT**: Before using this feature, install Python dependencies:

```bash
pip install -r requirements.txt
```

This will install transformers, torch, and other required packages (~2GB download).

**First Run**: The FLAN-T5 model (~950MB) will download automatically on first generation. This may take 2-5 minutes depending on your internet speed. Backend has a 5-minute timeout. If it times out, try again - partial downloads are cached. Subsequent runs are much faster (~30-60 seconds).

### Completed
- [x] Database migration created (`supabase/create_flashcards_tables.sql`)
- [x] Python generation script (`backend/scripts/generate_flashcards.py`)
- [x] Backend service (`backend/src/services/flashcard.service.ts`)
- [x] Backend controller (`backend/src/controllers/flashcard.controller.ts`)
- [x] Backend routes (`backend/src/routes/flashcard.routes.ts`)
- [x] Routes registered in server.ts
- [x] Frontend types (`frontend/src/types/flashcard.ts`)
- [x] Frontend service (`frontend/src/services/flashcard.service.ts`)
- [x] FlashcardGenerationPanel updated with card count selector
- [x] FlashcardsView wired to real API with polling
- [x] StudyMode persists card status to database
- [x] Mock data removed from constants.ts

---

## Database Schema

### `flashcard_sets` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workspace_id | UUID | FK to workspaces |
| user_id | UUID | Creator's user ID |
| title | TEXT | Set title (topic-based or default) |
| source_ids | UUID[] | Resource IDs used for generation |
| card_count | INT | Requested number of cards |
| status | TEXT | pending/processing/ready/failed |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### `flashcards` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| set_id | UUID | FK to flashcard_sets (CASCADE delete) |
| front | TEXT | Question/term |
| back | TEXT | Answer/definition |
| position | INT | Order within set |
| status | TEXT | unknown/known/review (user progress) |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/flashcards/generate` | Create set + trigger generation |
| GET | `/api/flashcards/workspace/:workspaceId` | List sets for workspace |
| GET | `/api/flashcards/:id` | Get single set with cards |
| DELETE | `/api/flashcards/:id` | Delete set (cascades cards) |
| PATCH | `/api/flashcards/:id/cards/:cardId/status` | Update card progress |
| POST | `/api/flashcards/:id/regenerate` | Re-generate cards for set |

---

## AI Generation

**Model**: `google/flan-t5-small` (default) via HuggingFace Transformers, falls back to `flan-t5-base`

**Process**:
1. Combine extracted text from selected resources
2. Split into meaningful chunks (30-150 words per chunk)
3. **Batch** generate questions for all candidate chunks (batches of 8)
4. Filter and deduplicate questions
5. **Batch** generate answers from context for valid questions
6. Assemble and return as JSON array

**Performance**: ~20-40 seconds for 10 cards on CPU (batched inference with beam=2)

**Prompt Templates**:
- Question: `"Generate a clear study question about: {chunk}"`
- Answer: `"Answer concisely: {question}\nContext: {chunk}"`

---

## File Structure

```
backend/
├── scripts/
│   └── generate_flashcards.py          ← NEW
├── src/
│   ├── routes/flashcard.routes.ts      ← NEW
│   ├── controllers/flashcard.controller.ts  ← NEW
│   ├── services/flashcard.service.ts   ← NEW
│   └── server.ts                       ← MODIFIED (added routes)

frontend/
├── src/
│   ├── types/flashcard.ts               ← NEW
│   ├── services/flashcard.service.ts    ← NEW
│   └── components/workspace/
│       ├── FlashcardsView.tsx           ← MODIFIED (API integration)
│       └── flashcards/
│           ├── FlashcardGenerationPanel.tsx  ← MODIFIED (card count)
│           ├── StudyMode.tsx            ← MODIFIED (persist status)
│           └── constants.ts             ← MODIFIED (removed mocks)

supabase/
└── create_flashcards_tables.sql         ← NEW

documents/
└── flashcards-implementation.md         ← THIS FILE
```

---

## Usage

### Generating Flashcards

1. Navigate to workspace → Flashcards tab
2. Click "Generate" button
3. Select one or more resources with extracted text
4. (Optional) Enter a topic focus
5. Adjust card count slider (5-20)
6. Click "Generate Flashcards"
7. Wait for generation (~30-60 seconds)

### Studying Flashcards

1. Click "Study" on any flashcard set
2. Use arrow keys or buttons to navigate
3. Press Space or click card to flip
4. Mark cards as "Known" or "Review Later"
5. Progress is saved automatically

---

## Dependencies

**No new dependencies required!**

Existing `requirements.txt` includes:
- `transformers` — for FLAN-T5 model
- `torch` — PyTorch backend
- `sentencepiece` — tokenizer for T5 models

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-01 | Initial implementation complete |
| 2026-04-01 | Database migration applied |
| 2026-04-01 | All backend endpoints created |
| 2026-04-01 | Frontend fully wired to API |
| 2026-04-01 | Mock data removed |
| 2026-04-02 | Performance optimization: batched inference, flan-t5-small default, beam=2 |
