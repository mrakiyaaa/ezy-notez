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

**No API key or large model required**. Uses NLTK (already installed). Generation takes ~1-3 seconds.

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

**Approach**: Extractive NLP using NLTK (no external APIs or large AI models)

**Process**:
1. Combine extracted text from selected resources
2. Split into sentences and score using TF-IDF importance
3. Classify sentences by type (definition, cause/effect, process, comparison, etc.)
4. Extract key subjects using POS tagging and noun phrase extraction
5. Generate pattern-based questions matched to sentence type
6. Build answers from key sentences + neighboring context
7. Deduplicate by subject and return as JSON array

**Performance**: ~1-3 seconds for 10 cards (no model loading, pure NLP)

**Techniques used**:
- TF-IDF sentence scoring for importance ranking
- POS tagging for subject/noun phrase extraction
- Regex-based sentence classification (6 types + general)
- Topic relevance scoring with partial word matching
- Subject deduplication for diverse card coverage

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
7. Wait for generation (~3-8 seconds)

### Studying Flashcards

1. Click "Study" on any flashcard set
2. Use arrow keys or buttons to navigate
3. Press Space or click card to flip
4. Mark cards as "Known" or "Review Later"
5. Progress is saved automatically

---

## Dependencies

**No new dependencies required!**

Uses existing `nltk` package (already in `requirements.txt`). No new dependencies needed.

NLTK data (`punkt_tab`, `averaged_perceptron_tagger_eng`, `stopwords`) is auto-downloaded on first run.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-01 | Initial implementation complete |
| 2026-04-01 | Database migration applied |
| 2026-04-01 | All backend endpoints created |
| 2026-04-01 | Frontend fully wired to API |
| 2026-04-01 | Mock data removed |
| 2026-04-02 | Switched to Extractive NLP (NLTK) for ~1-3s generation, no API/model needed |
