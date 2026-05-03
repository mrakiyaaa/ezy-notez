# Profile View Drawer — Workspace Hub

## Overview

A slide-in profile drawer accessible from the workspace hub page (and all dashboard pages). Clicking the user avatar/name in the top-right header opens the drawer.

## Entry Point

**Trigger:** Avatar + name button in the sticky dashboard header (`layout.tsx`).

**Visible on:** All dashboard pages where `isWorkspaceDetail` is `false` — i.e., the workspace hub (`/workspaces`) and any other non-detail dashboard route.

## Features

- Displays user avatar (initials fallback), full name, and email
- Inline full name editing — saves to the `profiles` Supabase table via `useProfile.updateProfile`
- Read-only email field
- **Sign out** button — calls `supabase.auth.signOut()` and redirects to `/auth/login`
- Backdrop overlay; clicking it closes the drawer
- Slide-in from the right with CSS transition

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/app/(dashboard)/layout.tsx` | Made avatar clickable; wired `ProfileDrawer` with `isOpen`, `onSave`, `onSignOut` |

## Files Used (unchanged)

| File | Role |
|------|------|
| `frontend/src/components/profile/ProfileDrawer.tsx` | Drawer UI component |
| `frontend/src/hooks/useProfile.ts` | Provides `profile`, `updateProfile`, `signOut` |

## Data Flow

```
User clicks avatar → setIsProfileOpen(true)
  → ProfileDrawer renders (slide-in)
  → onSave(name) → useProfile.updateProfile({ full_name }) → Supabase profiles table
  → onSignOut()  → supabase.auth.signOut() → redirect /auth/login
```
