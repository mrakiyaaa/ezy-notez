# Workspace Hub Sidebar — Live Data Integration

## Overview
The right-hand sidebar on the workspaces hub (`/workspaces`) previously rendered mock data for three panels:
- **Study Room Invites**
- **Upcoming Activities**
- **Daily Briefing**

This feature swaps each panel for live, cross-workspace data sourced from the authenticated user's actual work across the app.

## What changed

### 1. Study Room Invites → real pending email invites
- The sidebar now calls `getPendingInvites()` (`GET /api/study-rooms/invites/pending`) and lists every pending `study_room_invites` row addressed to the logged-in user's email, across all workspaces they're invited to.
- The old mock `StudyInvites` component and `Invite` type were removed. The sidebar reuses the polished `StudyRoomInvitesPanel` that already powers the per-workspace study-room landing page.
- Join: calls `acceptInvite(token)`, removes the invite from the list, then navigates to `/workspaces/{workspaceSlug}?tab=studyroom&room={roomId}` using the `workspaceSlug` returned on the `PendingInvite` payload. (The slug is sourced from the backend because the invitee is typically not a member of the host's workspace, so the local workspace list can't resolve it.)
- Dismiss: calls `dismissInvite(inviteId)` (optimistic UI — item is removed immediately).
- Empty state uses a dotLottie animation from LottieFiles plus the copy "No invites right now."
- Loading state renders two skeleton invite cards.

### 2. Upcoming Activities + Daily Briefing → real analytics
A new backend endpoint aggregates cross-feature data into the shape the sidebar already expects:

**Endpoint:** `GET /api/analytics/hub`
**Response:**
```json
{
  "status": "success",
  "data": {
    "activities": [
      { "id": "...", "title": "...", "category": "...", "status": "pending|in-progress|done", "progress": 0, "dueAt": "..." }
    ],
    "briefing": ["...", "..."]
  }
}
```

**Activities** are computed from:
- Study rooms the user hosts with status `waiting` or `in_progress`.
- Study rooms the user is a non-host participant in with status `waiting` or `in_progress`.
- Quizzes in any of the user's workspaces that are `ready` but have no `completed` attempt by this user.

They're sorted with in-progress items first, then pending, newest first, capped at 6.

**Briefing** is a short list of rule-based sentences summarising pending work:
- Pending study room invite count.
- Hosted rooms waiting to start.
- Live rooms to rejoin.
- Ready-but-unattempted quizzes.
- Resources added in the last 7 days.
- Falls back to a positive "all caught up" message when nothing is pending.

Capped at 4 sentences.

## New files
- `backend/src/services/analytics.service.ts` — aggregator that pulls from `study_rooms`, `study_room_participants`, `study_room_invites`, `quizzes`, `quiz_attempts`, `resources`, `flashcard_sets`, `workspaces`.
- `backend/src/controllers/analytics.controller.ts` — HTTP handler.
- `backend/src/routes/analytics.routes.ts` — router (mounted at `/api/analytics`).
- `frontend/src/services/analytics.service.ts` — thin fetcher returning `HubAnalytics`.

## Modified files
- `frontend/src/app/(dashboard)/workspaces/page.tsx` — fetches real invites + hub analytics in parallel, wires join/dismiss handlers.
- `frontend/src/components/dashboard/CollapsibleSidebar.tsx` — accepts loading flags and join/dismiss callbacks; renders `StudyRoomInvitesPanel`.
- `frontend/src/components/dashboard/UpcomingActivities.tsx` — adds loading skeletons, handles `progress = 0`.
- `frontend/src/components/dashboard/DailyBriefing.tsx` — adds loading skeletons; removed placeholder "View full analysis" button.
- `frontend/src/components/workspace/study-room/StudyRoomInvitesPanel.tsx` — always renders (no early null), lottie empty state, loading skeletons.
- `frontend/src/components/workspace/StudyRoomView.tsx` — reads `?room=<id>` query param and auto-enters the study-room lobby so invite accepts land straight in the right lobby.
- `backend/src/server.ts` — registers the new analytics router.

## Deleted files
- `frontend/src/components/dashboard/StudyInvites.tsx` (replaced by `StudyRoomInvitesPanel`)
- `frontend/src/services/workspace.service.ts` (mock-only service, no longer referenced)
- `frontend/src/types/invite.ts` (dead type)
- `frontend/src/constants/mock/invites.json`
- `frontend/src/constants/mock/activities.json`

## Dependencies
- `@lottiefiles/dotlottie-react` — added to `frontend/package.json`; renders the dotLottie animation in the empty invites state.

## Auth flow notes
- `/api/analytics/hub` and `/api/study-rooms/invites/pending` both run under the standard `authenticateUser` middleware; they key off `req.user.id` (for workspace scoping) and `req.user.email` (to match `study_room_invites.email`). Dismiss uses the caller's email to ensure you can only dismiss your own invites.

## UX details
- Invite join awaits `acceptInvite(token)` before routing. Failures bubble back to `InviteCard` and render an inline red error pill above the action buttons; the card stays on screen so the user can retry. The Join button shows a "Joining…" loading state while the request is in flight.
- The existing `tab=studyroom` query already opens the Study Room view inside `WorkspacePage`; the new `room=<id>` param layers on top and auto-enters the lobby, then strips itself from the URL so a back-navigation doesn't re-trigger.
- Collapsed-sidebar indicator dots still reflect pending invites and active activities, now driven by real counts.
