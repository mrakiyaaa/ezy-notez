# Study Room Feature

## Overview
The Study Room feature enables real-time collaborative quiz battles within a workspace. Users can create rooms, invite friends via OTP code or email, and compete in MCQ quizzes generated from workspace resources. Results include leaderboards, badges, AI insights, and a revision mode for wrong answers.

## Architecture

### Navigation Flow
```
Landing Page → Create Room Modal → Lobby → Live Quiz → Results
```

All views are managed by `StudyRoomView.tsx`, which holds a `viewMode` state (`landing | lobby | quiz | results`) and the active `StudyRoom` object. This is rendered inside the workspace page when the `studyroom` nav item is selected.

### File Structure
```
src/
├── types/studyRoom.ts                          # All type definitions
├── services/studyRoom.service.ts               # Placeholder API functions
├── components/workspace/
│   ├── StudyRoomView.tsx                       # Root container / view router
│   ├── StudyRoomLanding.tsx                    # Landing page with sections
│   ├── StudyRoomLobby.tsx                      # Waiting room with realtime
│   ├── StudyRoomQuiz.tsx                       # Live quiz with answer flow
│   ├── StudyRoomResults.tsx                    # Leaderboard, badges, revision
│   └── study-room/
│       ├── CreateRoomModal.tsx                 # Two-step create room modal
│       ├── InvitationCard.tsx                  # Active invitation card
│       ├── RoomCard.tsx                        # Recent/hosted room card
│       ├── EmptyState.tsx                      # Empty section placeholder
│       ├── ParticipantAvatar.tsx               # Avatar with status/confirm dots
│       ├── PointsCounter.tsx                   # Animated point counter
│       └── DisconnectModal.tsx                 # Host disconnect prompt
```

### Modified Files
- `app/(dashboard)/workspaces/[slug]/page.tsx` — Replaced placeholder `StudyRoomView` with real component, added import.
- `app/globals.css` — Added Study Room CSS keyframe animations.

## Service Functions (studyRoom.service.ts)
All functions are placeholder — they log calls and return mock data. Wire to backend when ready.

| Function                | Purpose                                    |
|-------------------------|--------------------------------------------|
| `createStudyRoom()`     | Create a new room, returns OTP if applicable |
| `joinRoomWithOtp()`     | Join a room using OTP code                 |
| `startRoom()`           | Host starts the quiz                       |
| `submitAnswer()`        | Submit answer for current question         |
| `nextQuestion()`        | Move to next question (host)               |
| `getResults()`          | Fetch final results and leaderboard        |
| `getInsights()`         | Fetch AI-generated insights                |
| `getActiveInvitations()`| Get pending invitations                    |
| `getRecentRooms()`      | Get rooms user participated in             |
| `getHostedRooms()`      | Get rooms user hosted                      |
| `getLobbyParticipants()`| Get current lobby participants             |
| `getCurrentQuestion()`  | Get the active quiz question               |

## Supabase Realtime Events
Channel: `study-room:${roomId}`

| Event                    | Used In       | Purpose                              |
|--------------------------|---------------|---------------------------------------|
| `participant:joined`     | Lobby         | New participant entered               |
| `participant:disconnected`| Lobby, Quiz  | Participant left                      |
| `quiz:started`           | Lobby         | Host started the quiz                 |
| `answer:confirmed`       | Quiz          | A participant confirmed their answer  |
| `question:next`          | Quiz          | Host moved to next question           |
| `room:ended`             | Quiz          | Quiz session completed                |

## State Management
- **Landing**: `useState` for invitations, recent rooms, hosted rooms
- **Lobby**: `useState` for participants, disconnect banner
- **Quiz**: `useReducer` tracking `currentQuestion`, `selectedAnswer`, `confirmedAnswer`, `answerRevealed`, `userPoints`, `isCorrect`, `explanation`
- **Results**: `useState` for results data, insights, revision toggle

## Animations (globals.css)
| Class              | Effect                                    | Duration |
|--------------------|-------------------------------------------|----------|
| `sr-float-points`  | "+100" floats up and fades                | 1.2s     |
| `sr-counter-bump`  | Points counter scales up/down             | 0.4s     |
| `sr-slide-in`      | Participant slides in from left           | 0.3s     |
| `sr-fade-in`       | Fade in + slight upward shift             | 0.25s    |
| `sr-pulse-glow`    | Blue accent glow pulse (OTP digits)       | 2s loop  |
| `sr-option-select` | Subtle scale on option selection          | 0.2s     |

## Backend Integration Checklist
When implementing the backend, connect these:
- [ ] Replace mock returns in `studyRoom.service.ts` with real API calls
- [ ] Implement Supabase Realtime broadcast from backend on each event
- [ ] Wire AI Insights to OpenRouter or chosen LLM provider
- [ ] Implement OTP generation and validation
- [ ] Implement email invitation sending
- [ ] Add authentication checks for host-only actions
