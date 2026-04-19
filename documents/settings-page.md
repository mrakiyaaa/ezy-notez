# Settings Page

## Overview

Centralized settings hub for the Ezy Notez dashboard. Accessed from the **Settings icon button** inside the profile popover in the workspace sidebar (bottom-left of a workspace slug page).

Route: `/settings` (redirects to `/settings/profile`)

## Structure

```
frontend/src/app/(dashboard)/settings/
  layout.tsx            # sub-nav shell + Logout
  page.tsx              # redirects to /settings/profile
  profile/page.tsx      # Profile
  workspace/page.tsx    # Workspace settings
  preferences/page.tsx  # Preferences
  subscription/page.tsx # Subscription
```

The layout is a client component that renders a left sub-nav (Profile, Workspace settings, Preferences, Subscription) and a Logout button pinned to the footer. The right pane renders the active sub-page. The outer dashboard layout still provides the top logo header.

## Sub-pages

### Profile (`/settings/profile`)
Reads/writes the user's display name via `useProfile().updateProfile`. Email is read-only (from Supabase auth). Avatar falls back to initials.

### Workspace settings (`/settings/workspace`)
Lists all the user's workspaces (via `getWorkspacesApi`). Each row supports:
- **Open** — link to `/workspaces/<slug>`
- **Delete** — calls `deleteWorkspaceApi(id)` after a `confirm()` prompt

A "New workspace" button routes to `/workspaces` (the hub where creation lives).

### Preferences (`/settings/preferences`)
Local-only per-device toggles persisted to `localStorage` under the key `ezynotes:preferences`:
- `emailUpdates`
- `studyReminders`
- `soundEffects`

No backend integration yet — these are UI scaffolding that other features can read from localStorage when they need them.

### Subscription (`/settings/subscription`)
Static display of the current plan (Free) and three plan cards (Free / Pro / Team). Upgrade/billing buttons are disabled — backend billing is not implemented.

## Logout
Rendered in the settings layout footer. Calls `useProfile().signOut`, which clears the Supabase session and redirects to `/auth/login`.

## Entry point

`frontend/src/app/(dashboard)/workspaces/[slug]/page.tsx` — the sidebar footer profile chip opens a small upward popover containing a single gear icon button. Clicking it navigates to `/settings`.

## Related files
- `frontend/src/hooks/useProfile.ts` — profile/auth state and `updateProfile`, `signOut`
- `frontend/src/api/workspace.api.ts` — `getWorkspacesApi`, `deleteWorkspaceApi`
- `frontend/src/app/(dashboard)/layout.tsx` — outer dashboard logo header (profile chip was removed here)

## Notes for future work
- Workspace rename/description/aura editing — no backend `updateWorkspaceApi` exists yet. Add one before exposing rename UI.
- Preferences — move to Supabase `profiles` row when server-side reads are needed across devices.
- Subscription — wire up Stripe (or equivalent) and replace the static plan cards with live entitlement data.
