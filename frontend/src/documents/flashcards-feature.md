# Flashcard Generation Feature

## Overview

AI-powered flashcard generation tab inside the workspace dashboard. Users select workspace resources, optionally set a topic focus, and generate a set of study flashcards. Sets are stored locally (mock) and can be studied in an immersive full-screen study session.

## File Structure

```
frontend/src/components/workspace/
├── FlashcardsView.tsx                    # Main orchestrator + empty/list/generating states
└── flashcards/
    ├── constants.ts                      # Types, mock data, date utility
    ├── FlashcardGenerationPanel.tsx      # Resource picker + topic input + generate trigger
    ├── FlashcardSetGrid.tsx              # Responsive grid of set cards
    ├── FlashcardSetCard.tsx              # Individual set card (progress, study/delete actions)
    ├── FlashcardFlipCard.tsx             # 3D CSS flip card (question / answer faces)
    └── StudyMode.tsx                     # Full study session with keyboard nav + completion screen
```

## Data Shapes

```ts
interface FlashcardSet {
  id: string;
  title: string;
  resourceId: string;
  resourceName: string;
  cards: Flashcard[];
  createdAt: string;
  knownIds: string[];        // card IDs marked Known in last session
}

interface Flashcard {
  id: string;
  front: string;             // question / term
  back: string;              // answer / definition
}
```

## Views / States

| State | Description |
|-------|-------------|
| Empty | No sets exist — dot-grid background, glowing CTA button |
| Generation panel | Slide-in panel: resource checkboxes + topic input + Generate button |
| Generating (shimmer) | 3-column shimmer skeleton while awaiting API response |
| Set grid | Responsive grid of FlashcardSetCard components |
| Study mode | Full-height study session replacing the grid view |
| Completion screen | Summary of Known / To Review counts with Restart / Exit options |

## Study Mode Controls

| Input | Action |
|-------|--------|
| Click card | Flip |
| Space | Flip |
| Arrow Right | Next card |
| Arrow Left | Previous card |
| Known button | Mark known, advance |
| Review Later button | Mark for review, advance |

## Design Tokens Used

- `bg-main`, `bg-bg-card`, `border-fade-border` — backgrounds and borders
- `text-text-primary`, `text-text-secondary`, `text-text-muted` — typography
- `auraHex` / `auraRgb` — workspace accent color for glows, headings, progress bars, buttons
- `auraContrast` — foreground text on aura-colored backgrounds

## Replacing Mock Data

The `handleGenerate` function in `FlashcardsView.tsx` contains a `setTimeout` stub. Replace with a real API call:

```ts
const response = await apiClient.post("/flashcards/generate", {
  resourceIds,
  topic,
  workspaceId,
});
const newSet: FlashcardSet = response.data;
```

`MOCK_FLASHCARD_SETS` in `constants.ts` can be replaced with a fetch on mount once the backend endpoint exists.
