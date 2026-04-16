# Study Room Backend Routes

## Overview

Express.js backend for the multiplayer study room feature. All routes are protected by `authenticateUser` middleware.

Base path: `/api/study-rooms`

## Files created

| File | Purpose |
|---|---|
| `backend/src/routes/studyRoom.routes.ts` | Route definitions |
| `backend/src/controllers/studyRoom.controller.ts` | Request handlers |
| `backend/src/services/studyRoom.service.ts` | DB operations + domain errors |
| `backend/src/services/studyRoomAI.service.ts` | OpenRouter AI calls (questions + insights) |
| `backend/src/services/email.service.ts` | Email placeholder (`sendStudyRoomInvite`) |

`server.ts` updated to register `app.use("/api/study-rooms", studyRoomRoutes)`.

## Routes

| Method | Path | Description |
|---|---|---|
| POST | `/` | Create room; OTP or email invite |
| POST | `/join-by-code` | Join using 6-digit OTP code (no roomId needed) |
| POST | `/:roomId/join-otp` | Join using roomId + OTP |
| GET | `/invite/:token` | Validate email invite token |
| POST | `/invite/:token/accept` | Accept invite + join room |
| GET | `/invitations` | Active waiting rooms for current user (non-host) |
| GET | `/recent` | Completed rooms user participated in |
| GET | `/hosted` | Rooms created by current user |
| POST | `/:roomId/start` | Host starts room; generates questions (resource_ids from DB) |
| POST | `/:roomId/answer` | Submit answer; broadcasts confirmation |
| POST | `/:roomId/next` | Host advances to next question |
| GET | `/:roomId/results` | Final leaderboard + wrong answers + badges |
| GET | `/:roomId/current-question` | Current in-progress question (uses current_question_order) |
| POST | `/:roomId/insights` | AI weak-topic analysis |
| GET | `/:roomId` | Room details + participant list |

## Error codes

| Code | Meaning |
|---|---|
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (non-host acting as host, or not a participant) |
| 404 | Room / invite / question not found |
| 409 | Duplicate answer submission |
| 410 | Expired OTP |
| 500 | Unexpected server error |

## Domain error classes (`studyRoom.service.ts`)

- `NotFoundError` → 404
- `ValidationError` → 400
- `ForbiddenError` → 403
- `OtpExpiredError` → 410
- `DuplicateAnswerError` → 409

The controller's `resolveStatus()` helper maps these automatically.

## AI service (`studyRoomAI.service.ts`)

Uses `OPENROUTER_API_KEY` env var (present in `.env`).  
Model: `google/gemini-flash-1.5`. All calls go through the shared `utils/openRouterClient.ts`.

### `generateRoomQuestions(roomId, resourceContent, questionCount, workspaceId) → GeneratedQuestion[]`
1. Pre-fetches all existing question hashes from `used_questions` for the workspace.
2. Fetches recent question texts from `study_room_questions` (via workspace rooms, limit 40) for the prompt exclusion hint.
3. Calls OpenRouter with **system + user** messages.
4. Parses the JSON array response; strips accidental markdown fences.
5. SHA-256 hashes each question text; discards any whose hash is already in the pre-fetched set.
6. If 0 unique: logs warning, returns `[]` (does not throw).
7. If fewer than `questionCount`: logs warning, proceeds with available.
8. Inserts unique questions into `study_room_questions` with `order_index` (0-based) using `.select()` to return rows.
9. Records hashes in `used_questions` (failure is non-fatal — logs warning).

Options format stored in DB: `{ "A": "...", "B": "...", "C": "...", "D": "..." }` (JSONB object).

### `generateInsights(userId, roomId) → string`
- Fetches all of the user's answers joined with question text/correct_answer/explanation.
- Returns a positive string if all answers were correct (no AI call).
- Builds system + user prompt with the wrong answers formatted as `Q | Their answer | Correct | Explanation`.
- Always returns a string — **never throws**. Returns a fallback message on any error.

## Shared OpenRouter client (`utils/openRouterClient.ts`)

`callOpenRouter(systemPrompt, userPrompt, model) → string`
- Checks `OPENROUTER_API_KEY` is set before calling (throws if missing).
- Headers: `Authorization`, `Content-Type`, `HTTP-Referer: https://ezynotez.app`, `X-Title: EZY Notez`.
- On non-2xx: throws `"OpenRouter returned {status}: {body}"`.
- On timeout: throws descriptive message.
- Checks for empty content in response.

## Resource content service (`studyRoomResources.service.ts`)

`fetchResourceContent(resourceIds: string[]) → string`
- Fetches `extracted_text` from resources with `status = "ready"`.
- Concatenates all usable texts.
- Trims combined content to **12,000 characters**.
- Logs a warning when trimming is applied.

## Email service (`email.service.ts`)

`sendStudyRoomInvite(email, roomTitle, inviteUrl)` is a placeholder that logs to console.  
To activate: add `RESEND_API_KEY` to `.env` and replace the `console.log` with a Resend API call.

## Realtime broadcasts (Supabase channel `study-room:{roomId}`)

Service: `studyRoomRealtime.service.ts`. All functions are fire-and-forget — a failure does not affect the HTTP response.

| Event | Triggered by | Payload |
|---|---|---|
| `participant:joined` | `joinWithOtpHandler` / `acceptInviteHandler` | `{ userId, displayName, isHost, joinedAt }` |
| `participant:disconnected` | `broadcastParticipantDisconnected` | `{ userId }` |
| `quiz:started` | `startRoomHandler` | `{ question: {id, question, options, order_index}, totalQuestions }` |
| `answer:confirmed` | `submitAnswerHandler` | `{ questionId, userId, allConfirmed }` |
| `question:next` | `nextQuestionHandler` | `{ question: {id, question, options, order_index}, previousAnswer: {correct_answer, explanation} }` |
| `room:ended` | `nextQuestionHandler` (when completed) | `{ roomId }` |

Options in broadcast payloads are `{A,B,C,D}` objects. The frontend `normaliseQuestion()` helper in `StudyRoomQuiz.tsx` converts them to `string[]` and maps `correct_answer` letter to numeric index on receipt.

## OTP flow

- Generated at room creation (6-digit numeric string).
- Expires 10 minutes after creation (`otp_expires_at`).
- Expired OTP returns HTTP 410.
- Room must be in `waiting` status to accept joins.
