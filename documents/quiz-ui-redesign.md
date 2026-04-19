# Quiz Generator UI Redesign

## Overview
Visual redesign of the Quiz Generator page to match an updated spec. All existing quiz generation logic, API calls, state management, and session handling were preserved — only the visual implementation changed.

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/components/workspace/QuizView.tsx` | Page layout, header, section headers, card grid |
| `frontend/src/components/workspace/quiz/QuizCard.tsx` | Card redesign with accent bar, badges, progress bar |
| `frontend/src/components/workspace/quiz/QuizConfigForm.tsx` | Two-column panel layout with Zap header |
| `frontend/src/components/workspace/quiz/QuestionTypeToggle.tsx` | 3-col chip grid with label + description |
| `frontend/src/components/workspace/quiz/ResourceChipSelector.tsx` | Updated pill styling, removed checkbox |
| `frontend/src/components/workspace/quiz/constants.ts` | Updated question type descriptions |

## Design Decisions

### Page Layout
- Main content area uses `bg-main`, `p-7`, `flex flex-col gap-6`
- Header: 48×48px `bg-blue-accent/10` icon box with `HelpCircle` icon, title "Quiz Generator"
- `+ Generate Quiz` button toggles the generate panel open/closed

### Generate Panel
- Panel: `bg-bg-card border border-fade-border rounded-xl overflow-hidden`
- Header: Zap icon in 34×34px icon box, close button with red hover state
- Body: `grid grid-cols-2` — resources on left, config on right separated by a border

### Quiz Cards
- Fixed `w-75 shrink-0` (300px) — no grid stretching
- Left accent bar: blue (new), amber (in-progress), green (completed)
- Progress bar shown on all cards (0% for new, partial for in-progress, 100% for completed)
- Action row: primary button + separate trash delete button
- Completed action renamed from "View Results" → "Review"

### Section Headers
- 7×7px dot + label in `text-text-primary font-semibold text-sm`
- In-progress & new sections: `bg-blue-accent` dot
- Completed / all quizzes section: `bg-text-muted` dot

### Tokens Used
- No hardcoded hex values — exclusively Tailwind design tokens
- `bg-main`, `bg-bg-card`, `bg-blue-accent`, `border-fade-border`
- Opacity variants: `/10`, `/12`, `/15`, `/30`, `/40`, `/50`, `/70`, `/85`
