# Aura Indicator Refactor

## Overview

The aura color system was refactored from a full workspace-wide color theme to a minimal visual indicator. Previously the selected aura hex was propagated as CSS custom properties and inline styles across the entire workspace shell, overriding borders, nav icon colors, badges, focus states, and more.

## What Changed

### Removed (theme application)
- `--workspace-aura` and `--workspace-aura-rgb` CSS variable injection on the workspace root div
- Aura-colored active/hover states on left sidebar nav buttons
- Aura-colored hover on the settings button
- Aura-tinted `rgba()` header bottom border
- Aura-colored nav subtitle badge (`backgroundColor + color` driven by aura)
- Aura-colored search input `onFocus`/`onBlur` border and box-shadow handlers
- Aura-colored circle swatch at the bottom of the left sidebar
- Aura-colored card border (`${auraHex}66`) on `WorkspaceCard`
- Aura-colored delete icon on `WorkspaceCard`
- Aura-colored aura keyword label on `WorkspaceCard`
- Aura-colored delete confirm button on `WorkspaceCard`

### Added

**`frontend/src/components/ui/AuraIndicator.tsx`** — shared component.  
Renders a single `8×8px` colored dot (`w-2 h-2 rounded-full`) using only the raw `hex` prop. No theme propagation, no CSS variable injection, no dynamic class generation.

**`WorkspaceCard`** — `AuraIndicator` placed inline to the left of the `{aura_keyword} aura` label. The label itself reverted to `text-text-muted`. Card border reverted to `border-fade-border`. Delete button uses `bg-red-600`.

**Workspace page header** — `AuraIndicator` placed inline after the workspace name `<h1>`. The nav subtitle label below it reverted to `text-text-muted` plain text.

## What Was NOT Changed
- `auraHex`, `auraRgb`, `auraContrast` are still computed and passed as props to all feature view child components (`ResourcesView`, `WorkspaceHome`, `Chattie`, `SummarizationView`, `FlashcardsView`, `QuizView`, `QuizAttemptView`, `QuizResultsView`).
- localStorage caching of aura values is unchanged.
- Workspace creation flow, aura selection UI, and backend storage are unchanged.
- All feature-level aura usage inside child view components is unchanged.

## Files Modified
| File | Change |
|------|--------|
| `frontend/src/components/ui/AuraIndicator.tsx` | Created — shared indicator component |
| `frontend/src/components/dashboard/WorkspaceCard.tsx` | Removed theme styles, added AuraIndicator |
| `frontend/src/app/(dashboard)/workspaces/[slug]/page.tsx` | Removed shell-level theming, added AuraIndicator in header |
