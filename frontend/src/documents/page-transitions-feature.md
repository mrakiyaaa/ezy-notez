# Page Transitions & Micro-Interactions

Smooth page and component animations powered by `framer-motion` and shared
`Variants` exported from [src/lib/animations.ts](../lib/animations.ts). The UI
colors, glows and glassmorphism styles are untouched — these animations only
wrap motion around the existing JSX.

## Overview

- Route changes under `(dashboard)` fade/slide between pages via
  `AnimatePresence mode="wait"`.
- Dashboard card grids stagger in from below.
- Modals scale up / fade in.
- The Settings left-nav active indicator slides between nav items using
  `layoutId`.
- Study-room leaderboard rows, rank badges and revision cards pop in with a
  spring-driven `popIn` variant.

## Shared variants — `src/lib/animations.ts`

All variants are reusable `Variants` objects so any component can opt in with
`<motion.X variants={...} initial="initial" animate="animate" exit="exit" />`.

| Variant                   | Purpose                                                        |
|---------------------------|----------------------------------------------------------------|
| `fadeSlideIn`             | Forward route entry — opacity 0→1, translateY 12→0, 0.25s     |
| `fadeSlideOut`            | Legacy/explicit exit — opacity 1→0, translateY 0→8, 0.15s     |
| `slideInFromLeft`         | Back-nav entry — translateX -20→0, opacity 0→1, 0.25s         |
| `staggerContainer`        | Container: staggerChildren 0.07s for dashboard cards           |
| `staggerItem`             | Each card item: opacity 0→1, translateY 16→0                  |
| `scaleUp`                 | Modal/sheet: scale 0.95↔1, opacity 0↔1, 0.2s                  |
| `popIn`                   | Rank badges: spring (stiffness 300, damping 20), scale 0→1    |
| `resultStaggerContainer`  | 0.05s child stagger for result rows                            |
| `resultStaggerItem`       | Single result/row item                                         |

## 1. Page transitions

`src/components/ui/PageTransition.tsx` is a client wrapper that:

1. Reads `usePathname()` and uses it as the `key` on an inner `motion.div`
   inside `<AnimatePresence mode="wait" initial={false}>`.
2. Listens for `popstate` to detect browser-back navigation — if the next
   pathname change is preceded by a popstate, the entry uses
   `slideInFromLeft`; otherwise it uses `fadeSlideIn`.
3. Exits with `fadeSlideOut` (opacity 1→0, translateY 0→8, 0.15s).

Wired in `src/app/(dashboard)/layout.tsx` — `children` is rendered inside
`<PageTransition>`, so every `(dashboard)` route participates.

## 2. Dashboard cards — `WorkspaceGrid`

`src/components/dashboard/WorkspaceGrid.tsx` is now a `motion.div` using
`staggerContainer`; each `WorkspaceCard` / `CreateWorkspaceCard` is wrapped in
a `motion.div` with `staggerItem`. Result: cards fade and rise into position
with a 0.07s delay between each.

## 3. Modal — `CreateWorkspaceModal`

`src/components/workspace/CreateWorkspaceModal.tsx` now renders the overlay
and card inside `<AnimatePresence>`. The backdrop fades; the inner card uses
`scaleUp` (scale 0.95→1 on entry, 1→0.95 on exit, both 0.2s).

## 4. Settings sidebar active indicator

In `src/app/(dashboard)/settings/layout.tsx` the blue active bar is a
`motion.div` with `layoutId="settings-nav-active-indicator"`. When the active
route changes, framer-motion animates the single shared element from its
previous position to the new one with a spring transition, giving a smooth
"glow pulse" slide between nav items. The bar's existing color and glow
utility classes are preserved; a subtle drop-shadow is added for the glow.

## 5. Study-room results

`src/components/workspace/StudyRoomResults.tsx`:

- `LeaderboardRow` is a `motion.div` with `resultStaggerItem`; the rank
  number is wrapped in a `motion.span` using `popIn` (spring 300 / 20).
- `BadgeCard` uses `resultStaggerItem`; the emoji icon uses `popIn`.
- `WrongAnswerCard` uses `resultStaggerItem`.
- The leaderboard, badges grid, and revision list are each wrapped in
  `motion.div` containers using `resultStaggerContainer`
  (staggerChildren 0.05s).

Previous `sr-fade-in` CSS class and `animationDelay` inline styles were
removed only where they duplicated the new framer-motion stagger — no colors,
glows or border styles were changed.

## Adding a new transition

1. Import the variant from `@/lib/animations`.
2. Replace the target element (or wrap it) with `motion.<tag>`.
3. Set `variants`, `initial`, `animate`, and (if inside `AnimatePresence`)
   `exit`.

Keep animation durations within the existing vocabulary — 0.15s for exits,
0.2–0.25s for entries, springs only for "pop" emphasis.
