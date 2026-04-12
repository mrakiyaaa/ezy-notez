# Aura Theme Removal — Feature Components

**Date:** 2026-04-12  
**Scope:** Full removal of `auraHex`/`auraRgb`/`auraContrast` prop-threading from all workspace feature components.

---

## What Was Done

Removed the aura colour-theming system from every workspace feature component. The aura colour (`auraHex`) is now used **only** for the `AuraIndicator` dot in the workspace header and on workspace cards — all other visual chrome uses the design system's `--color-blue-accent` token and `--color-fade-border`.

---

## Files Edited

### Quiz components
| File | Changes |
|------|---------|
| `quiz/constants.ts` | Removed `AuraProps` re-export and import from summarization constants |
| `quiz/AttemptTopBar.tsx` | Removed `AuraProps`, replaced border/progress-bar inline styles |
| `quiz/QuestionCard.tsx` | Removed `AuraProps`, replaced badge bg/color |
| `quiz/OptionButton.tsx` | Removed `AuraProps`, replaced selected-state styles, removed hover handlers |
| `quiz/QuizGeneratingState.tsx` | Removed `AuraProps`, removed glow animation, replaced spinner/icon/dot colours |
| `quiz/AnswerFeedback.tsx` | Removed `AuraProps`, replaced Next button bg/shadow, removed hover handlers |
| `quiz/QuestionTypeToggle.tsx` | Removed `AuraProps`, replaced selected tab bg/color |
| `quiz/ResourceChipSelector.tsx` | Removed `AuraProps`, replaced chip/checkbox/icon colours, removed hover handlers |
| `quiz/QuizConfigForm.tsx` | Removed `AuraProps`, replaced icon/count-button/generate-button styles, removed prop passing to children |
| `quiz/QuizCard.tsx` | Removed `AuraProps`, changed `accentColor`/`accentRgb` fallback to hardcoded blue, replaced button styles, removed hover handlers |

### Quiz view components
| File | Changes |
|------|---------|
| `QuizView.tsx` | Removed `AuraProps`, `auraProps` spread, EmptyState aura props; replaced notification/header/button styles |
| `QuizAttemptView.tsx` | Removed `AuraProps`, `auraProps` spread; replaced loader/submit-button styles, removed hover handlers |
| `QuizResultsView.tsx` | Removed `AuraProps`; replaced header border, gradient backgrounds, indicator dots, Retake button |

### Summarization components
| File | Changes |
|------|---------|
| `summarization/constants.ts` | Removed `AuraProps` interface definition |
| `summarization/SummaryContent.tsx` | Removed `auraHex` prop; h2 heading uses default class, bullet dot uses `--color-blue-accent` |
| `summarization/ProcessingPhase.tsx` | Removed `AuraProps`; replaced icon bg/color/progress-bar |
| `summarization/ConfigurePhase.tsx` | Removed `AuraProps`; replaced mode/format selectors, checkboxes, generate button, history card styles |
| `summarization/ResultsPhase.tsx` | Removed `AuraProps`; replaced format badge, re-summarize icon, tab buttons, removed `auraHex` from `SummaryContent` |
| `SummarizationView.tsx` | Removed `auraHex/auraRgb/auraContrast` props and `auraProps` spread |

### Flashcard components
| File | Changes |
|------|---------|
| `flashcards/constants.ts` | Removed `AuraProps` re-export and import |
| `flashcards/FlashcardFlipCard.tsx` | Removed `AuraProps`; removed border/shadow/shimmer aura styles; badge uses `--color-blue-accent` |
| `flashcards/StudyMode.tsx` | Removed `AuraProps`; replaced completion icon, progress bar, Known button, top bar border, Exit button |
| `flashcards/FlashcardSetCard.tsx` | Removed `AuraProps`; replaced stats badge, progress bar, Study button; removed hover handlers |
| `flashcards/FlashcardSetGrid.tsx` | Removed `AuraProps` and spread passthrough |
| `flashcards/FlashcardGenerationPanel.tsx` | Removed `AuraProps`; replaced icon bg/color, checkboxes, slider gradient, generate button |
| `FlashcardsView.tsx` | Removed `AuraProps` and all spread passes; shimmer uses neutral whites; empty state uses `--color-blue-accent` |

### Other components
| File | Changes |
|------|---------|
| `WorkspaceHome.tsx` | Removed `auraHex`/`auraRgb` props; welcome banner/cards/tip use `--color-blue-accent` and `rgba(80,125,188,…)` |
| `Chattie.tsx` | Removed `auraHex`/`auraRgb` props; avatar/bubbles/input button use fixed blue values |
| `ResourcesView.tsx` | Removed `auraHex`/`auraRgb`/`auraContrast` props; upload card/tabs/YouTube input use `--color-blue-accent` |
| `ResourceItem.tsx` | Removed `auraRgb` prop; border uses `border-fade-border` class |

### Page
| File | Changes |
|------|---------|
| `app/(dashboard)/workspaces/[slug]/page.tsx` | Removed `hexToRgb`/`getContrastColor` import and usage; removed all aura prop passing to child components; kept `auraHex` only for `AuraIndicator` |

---

## Replacement Convention

| Old style | New style |
|-----------|-----------|
| `backgroundColor: auraHex` (button) | `backgroundColor: "var(--color-blue-accent)"` |
| `color: auraHex` | `color: "var(--color-blue-accent)"` |
| `color: auraContrast` | `color: "#ffffff"` |
| `borderColor: auraHex` (selected) | `"var(--color-blue-accent)"` |
| `rgba(${auraRgb}, 0.X)` tints | `rgba(80, 125, 188, 0.X)` |
| `boxShadow` with auraRgb | Removed entirely |
| `radial-gradient` with auraRgb | Removed entirely |
| Hover handlers setting aura shadow/border | Removed entirely |

---

## What Was NOT Changed

- `components/ui/AuraIndicator.tsx` — untouched (correct as-is)
- `components/dashboard/WorkspaceCard.tsx` — untouched (correct as-is)
- Semantic quiz colours (QUIZ_AMBER, QUIZ_GREEN, QUIZ_RED) — all preserved
- All functional logic, API calls, state management, keyboard handlers
