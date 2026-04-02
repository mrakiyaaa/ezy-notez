# Flashcard Generation Feature – Implementation Documentation

## Overview

Flashcard generation using Extractive NLP (NLTK). Users select workspace resources, optionally set a topic focus and card count, then generate study flashcards. Progress (known/review status) persists to the database.

## Status: Complete

### Prerequisites

Install Python dependencies:

```bash
pip install -r requirements.txt
```

NLTK data (`punkt_tab`, `averaged_perceptron_tagger_eng`, `stopwords`) is auto-downloaded on first run. No API keys or large AI models required. Generation takes ~1-3 seconds.

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
| status | TEXT | pending / processing / ready / failed |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### `flashcards` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| set_id | UUID | FK to flashcard_sets (CASCADE delete) |
| front | TEXT | Question |
| back | TEXT | Answer |
| position | INT | Order within set |
| status | TEXT | unknown / known / review (user progress) |
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

## Generation Approach

**Method**: Extractive NLP using NLTK — no external APIs or large AI models.

**Pipeline**:
1. Combine extracted text from selected resources
2. Split into sentences, filter by length (8-60 words)
3. Score sentences using TF-IDF importance
4. Classify each sentence by type (definition, cause/effect, process, comparison, example, purpose)
5. Apply type-based score bonuses and optional topic relevance scoring
6. Extract subjects via POS tagging (noun phrase extraction)
7. Generate pattern-based questions matched to sentence type
8. Build answers from key sentences + neighbouring context
9. Deduplicate by subject, validate quality, return as JSON

**Performance**: ~1-3 seconds for 10 cards on CPU.

---

## File Structure

```
backend/
  scripts/
    generate_flashcards.py              # Extractive NLP generation script
  src/
    routes/flashcard.routes.ts          # Route definitions
    controllers/flashcard.controller.ts # HTTP handlers
    services/flashcard.service.ts       # Business logic + pipeline
    server.ts                           # Route registration

frontend/
  src/
    types/flashcard.ts                  # TypeScript types
    services/flashcard.service.ts       # API client
    components/workspace/
      FlashcardsView.tsx                # Main view (API integration)
      flashcards/
        FlashcardGenerationPanel.tsx    # Generation UI
        StudyMode.tsx                   # Study interface (persists status)
        FlashcardSetGrid.tsx            # Set list display
        FlashcardFlipCard.tsx           # Card flip component
        FlashcardSetCard.tsx            # Set card component
        constants.ts                    # Shared constants

supabase/
  create_flashcards_tables.sql          # Database migration

documents/
  flashcards-implementation.md          # This file
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
7. Cards appear within ~1-3 seconds

### Studying Flashcards

1. Click "Study" on any flashcard set
2. Use arrow keys or buttons to navigate
3. Press Space or click card to flip
4. Mark cards as "Known" or "Review Later"
5. Progress is saved automatically

---

## Dependencies

Uses `nltk` (already in `requirements.txt`). No additional packages needed.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-01 | Initial implementation (FLAN-T5 local model) |
| 2026-04-01 | Database migration, backend endpoints, frontend wired to API |
| 2026-04-02 | Replaced FLAN-T5 with Extractive NLP (NLTK) for ~1-3s generation |
| 2026-04-02 | Removed unused files (preload_model.py, FLASHCARD_SETUP.md, duplicate script) |
| 2026-04-02 | Refactored service/controller with improved error handling |
