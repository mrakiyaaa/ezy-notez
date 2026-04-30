# Study Room Invite Panel — Bug Fixes & Join-by-Code Feature

## Summary

Two bugs fixed in the Study Room invite system on the Workspace Hub page, plus a new "Join with Code" entry point added directly to the invites panel.

---

## Bug 1 — Invites not showing (fixed)

### Root cause

`getPendingInvites` in `backend/src/services/studyRoom.service.ts` used a PostgREST FK-embedded join:

```ts
.select("id, token, room_id, created_at, study_rooms(id, title, workspace_id, host_id)")
```

PostgREST resolves this join only when the FK constraint is registered in the schema cache. If the cache is stale or the FK relationship is absent, every row comes back with `study_rooms: null`. The subsequent filter `.filter((r) => r.study_rooms !== null)` then discards every row, returning `[]`. The frontend service catches any HTTP error silently and also returns `[]`, so the panel always shows the empty state.

### Fix

Replaced the single join query with three sequential queries:
1. Fetch `study_room_invites` rows (no join).
2. Fetch matching `study_rooms` rows using `.in("id", roomIds)`.
3. Fetch `profiles` for the host IDs.

This is immune to schema-cache issues and always resolves correctly via direct table lookups.

### Additional type fix

`InviteRow.status` was typed as `"pending" | "accepted"` but `dismissInvite` writes `"dismissed"` to the database. Added `"dismissed"` to the union so the type matches the database reality.

---

## Bug 2 — No OTP join option (fixed)

### New component: `JoinByCodeForm`

Added inline to `StudyRoomInvitesPanel.tsx` (same file, separate function component). It is only rendered when the parent passes an `onJoinedRoom` callback, so it remains opt-in for any future panel reuse contexts.

**Behaviour:**
- Collapsed by default — shows a single "Join with Code" button at the bottom of the panel.
- Expands inline to an OTP input + submit/cancel buttons (no modal/overlay).
- Validates 6-digit numeric code before making the API call.
- Calls `POST /api/study-rooms/join-by-code` via `joinRoomByCode()` (new service function).
- On success: collapses the form and calls `onJoinedRoom(roomId, workspaceId)`.
- On error: displays the backend error message inline (covers invalid code, expired OTP, room not in waiting state, already-joined).
- Loading state shown on the Join button while the request is in-flight.

### Prop chain

```
workspaces/page.tsx
  handleJoinedByCode(roomId, workspaceId)  — resolves workspace slug → router.push
  ↓ onJoinedByCode
CollapsibleSidebar.tsx
  ↓ onJoinedRoom
StudyRoomInvitesPanel.tsx
  ↓ onJoined
JoinByCodeForm (inline)
```

### New service function

`joinRoomByCode(otpCode: string): Promise<{ id: string; workspace_id: string }>` added to `frontend/src/services/studyRoom.service.ts`. Uses the existing `extractErrorMessage` helper so backend error messages (e.g. "This OTP code has expired") surface to the user.

---

## Files changed

| File | Change |
|---|---|
| `backend/src/services/studyRoom.service.ts` | `InviteRow.status` type + `getPendingInvites` rewrite |
| `frontend/src/services/studyRoom.service.ts` | `joinRoomByCode` service function |
| `frontend/src/components/workspace/study-room/StudyRoomInvitesPanel.tsx` | `JoinByCodeForm` component + `onJoinedRoom` prop |
| `frontend/src/components/dashboard/CollapsibleSidebar.tsx` | `onJoinedByCode` prop threaded through |
| `frontend/src/app/(dashboard)/workspaces/page.tsx` | `handleJoinedByCode` handler + prop wired to sidebar |
