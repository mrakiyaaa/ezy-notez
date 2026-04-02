# Summarization UI Redesign

## Overview

Redesign of the `SummarizationView.tsx` component to introduce a history section on the configuration page and a two-column results layout. No backend, routing, or API changes were made.

## Changes

### Phase 1 — Configuration + History

- Added a **Previous Summaries** history section below the Generate button
- History groups summaries into batches by creation-time proximity (60-second threshold)
- Each history card displays:
  - Mode badge (General / Customize)
  - Format badge (Bullet Points / Short / Detailed)
  - First 80 characters of content as preview
  - Creation date
  - Aura-colored left border accent
- Empty state shows a centered message when no summaries exist
- Clicking a history card navigates directly to the results view for that batch
- On mount, the component now stays on the configure phase (showing history) instead of auto-navigating to results

### Phase 2 — Processing

No changes.

### Phase 3 — Results (Full Redesign)

**Top Bar:**
- Left: Back arrow button returning to Phase 1 (preserves history, does not reset)
- Center: Mode title with icon
- Right: New Summary + Delete buttons

**Two-Column Layout (desktop: 65%/35%, mobile: stacked):**

Left Column:
- Summary content card with subtle aura glow border
- Header row: format badge (pill, aura-colored) + timestamp | Re-summarize button
- Content: formatted text with aura-colored bullet dots

Right Column:
- Sources Used card (collapsible, open by default) with file type icons and separators
- Summary Info card showing format, generated date, word count, and source count

**Bottom Tabs (Customize mode only):**
- Horizontal pill tabs per selected resource
- Aura-colored active tab
- Switching tabs updates the left column content

### Navigation Flow

- History card click → Phase 3 (view that batch)
- Back arrow on Phase 3 → Phase 1 (history preserved)
- New Summary button → Phase 1 (ready for new generation)
- Delete button → Deletes active batch only, returns to Phase 1

### State Changes

- `sourcesExpanded` default changed to `true`
- Added `groupIntoBatches()` helper for history grouping
- Added `handleBackToHome()` and `handleViewBatch()` navigation handlers
- Delete now scopes to the active batch instead of all summaries
- Mount effect no longer auto-navigates to results for completed summaries

## Design Tokens Used

- `bg-main`, `bg-bg-card`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `border-fade-border`
- Aura colors via inline styles: `auraHex`, `auraRgb`, `auraContrast`
- `rounded-xl` for cards, `rounded-full` for badges/pills
- `transition-all duration-200` on all interactive elements
- Hover glow: `box-shadow: 0 4px 20px rgba(auraRgb, 0.1)`
- History card hover: `translateY(-2px)` lift effect
