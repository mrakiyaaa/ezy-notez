# Study Room Route Refactor

## Goal

Move the Study Room out of the workspace `viewMode`-driven UI into a standalone
`/study-rooms` route group with its own layout. The workspace sidebar and the
hub invite panel remain entry points.

## Before

Study Room was rendered inside the workspace page when `activeNav === "studyroom"`.
A single `StudyRoomView` component held the viewMode state machine
(`landing → lobby → quiz → results`) — none of those steps had their own URL.
The hub invite panel routed accepts to `/workspaces/{slug}?tab=studyroom&room={roomId}`,
which the workspace page interpreted to mount the Study Room view and pre-enter
the lobby.

## After

Study Room is a top-level route tree:

```
/study-rooms?from={workspaceId}                     → landing
/study-rooms/{roomId}/lobby?from={workspaceId}      → lobby
/study-rooms/{roomId}/session?from={workspaceId}    → live quiz
/study-rooms/{roomId}/results?from={workspaceId}    → results
/study-rooms/invite/{token}                         → email invite landing
```

`?from=` carries the originating workspace id. The standalone layout
(`src/app/study-rooms/layout.tsx`) reads it, fetches the workspace by id, and
renders:

- EZY Notez logo (links to `/`)
- "Back to {Workspace Name}" link (or "Back to Hub" when `from` is absent)
- Active workspace chip (aura dot + name) when `from` is present

If the user lands on `/study-rooms` without `from`, the page redirects to
`/workspaces` (no aggregate cross-workspace landing).

## Backend additions

A new endpoint `GET /workspaces/by-id/:id` returns a workspace by id (the
existing `/workspaces/:slug` is by slug only). The standalone layout uses this
to resolve the `from` workspace id into a name + slug for the back link and
chip.

```
backend/src/services/workspace.service.ts   → getWorkspaceById()
backend/src/controllers/workspace.controller.ts → getWorkspaceByIdHandler
backend/src/routes/workspace.routes.ts      → router.get("/by-id/:id", ...)
```

The `/by-id/:id` route is declared **before** the `/:slug` route to prevent
shadowing.

Email invite URLs are built at `/study-rooms/invite/{token}` (was
`/study-room/invite/...` — singular). Updated in
`backend/src/services/studyRoom.service.ts`.

## Frontend structure

### Routes (Next.js App Router)

```
src/app/study-rooms/
├── layout.tsx                              # Standalone layout (logo, back link, workspace chip)
├── page.tsx                                # Landing — redirects to /workspaces if no `from`
├── invite/[token]/page.tsx                 # Email invite acceptance — moved
└── [roomId]/
    ├── lobby/page.tsx
    ├── session/page.tsx
    └── results/page.tsx
```

Each `[roomId]/*` page fetches the room via `getStudyRoomById(roomId)` and
hands a `room: StudyRoom` plus `fromWorkspaceId?: string` to the corresponding
component. Loading and error states are explicit on each page.

### Components (flat folder)

```
src/components/study-room/
├── StudyRoomLanding.tsx                    # Refactored — uses router instead of callbacks
├── StudyRoomLobby.tsx                      # Refactored — router for nav, accepts `fromWorkspaceId`
├── StudyRoomQuiz.tsx                       # Refactored — router-based onRoomEnded
├── StudyRoomResults.tsx                    # Refactored — router-based onBack
├── CreateRoomModal.tsx
├── DisconnectModal.tsx
├── EmptyState.tsx
├── InvitationCard.tsx
├── ParticipantAvatar.tsx
├── PointsCounter.tsx
├── RoomCard.tsx
├── StudyRoomInvitesPanel.tsx               # Moved; `onJoinedRoom` is now (roomId) not (roomId, workspaceId)
└── VoicePanel.tsx
```

Internal navigation between the four views uses `router.push()` and preserves
`?from=` whenever it is present.

### Removed files

- `src/components/workspace/StudyRoomView.tsx`            (viewMode state machine — replaced by routing)
- `src/components/workspace/StudyRoomLanding.tsx`         (moved)
- `src/components/workspace/StudyRoomLobby.tsx`           (moved)
- `src/components/workspace/StudyRoomQuiz.tsx`            (moved)
- `src/components/workspace/StudyRoomResults.tsx`         (moved)
- `src/components/workspace/study-room/`                  (moved — flat to `src/components/study-room/`)
- `src/app/study-room/`                                   (singular folder — replaced by `/study-rooms/*`)

## Entry-point changes

### Workspace sidebar — `src/app/(dashboard)/workspaces/[slug]/page.tsx`

The "Study Room" sidebar item is rendered as a `<Link>` to
`/study-rooms?from={workspace.id}` (instead of toggling `activeNav`). It never
shows an active state because clicking it leaves the workspace page.

`StudyRoomView` is no longer imported. The `?tab=studyroom` initial-tab logic
is removed. `NavItem` no longer includes `"studyroom"`.

### Workspace home tile — `src/components/workspace/WorkspaceHome.tsx`

`WorkspaceHome` now requires `workspaceId`. The Study Room AI tool card is a
`<Link>` to `/study-rooms?from={workspaceId}`; the other three tiles still call
`onNavigate(...)` to switch the in-page view.

### Hub invite panel — `src/app/(dashboard)/workspaces/page.tsx`

`handleJoinInvite` now redirects to `/study-rooms/{roomId}/lobby` (no `from`,
because the hub is not workspace-scoped). `handleJoinedByCode` does the same.
Both lost their dependency on resolving the workspace slug locally.

### Email invite landing — `src/app/study-rooms/invite/[token]/page.tsx`

After accepting, redirects to `/study-rooms/{roomId}/lobby` (was
`/workspaces/{slug}?tab=studyroom`). The `getWorkspacesApi()` lookup is gone —
slug is no longer needed for navigation.

## Realtime handoff

`quiz:started` broadcasts still pass the first question through `sessionStorage`
keyed by `ezn_room_first_question_{roomId}`. Lobby writes it; session reads
and clears. The mechanism survives the route transition unchanged.

## Constraints honoured

- Only Study Room and its entry points were touched — no other workspace
  features modified.
- Backend `/study-rooms/*` API routes were not modified; only `/workspaces/*`
  gained a new `by-id` endpoint and email URLs were updated.
- Semantic tokens only — `bg-main`, `bg-bg-card`, `text-blue-accent`,
  `text-text-primary`, `text-text-secondary`, `text-text-muted`,
  `border-fade-border`. Pre-existing inline rgba values were preserved during
  the move; no new ones were introduced.
- All loading and error states are explicit on the route pages and in the
  refactored components.
