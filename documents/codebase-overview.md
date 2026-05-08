# Codebase Overview

---

## 1. Frontend App Structure (`frontend/src/app/`)

```
frontend/src/app/
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── template.tsx
│   ├── profile/
│   │   └── page.tsx
│   ├── settings/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── preferences/
│   │   ├── profile/
│   │   ├── subscription/
│   │   └── workspace/
│   └── workspaces/
│       ├── page.tsx
│       └── [slug]/
├── auth/
│   ├── layout.tsx
│   ├── callback/route.ts
│   ├── login/page.tsx
│   └── signup/page.tsx
├── study-rooms/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── invite/[token]/page.tsx
│   └── [roomId]/
│       ├── lobby/page.tsx
│       ├── session/page.tsx
│       └── results/page.tsx
├── globals.css
├── layout.tsx
└── page.tsx
```

---

## 2. Backend Source Structure (`backend/src/`)

```
backend/src/
├── index.ts
├── server.ts
├── uploadthing.ts
├── config/
│   ├── env.ts
│   └── supabase.ts
├── controllers/
│   ├── analytics.controller.ts
│   ├── auth.controller.ts
│   ├── chatie.controller.ts
│   ├── flashcard.controller.ts
│   ├── quiz.controller.ts
│   ├── resource.controller.ts
│   ├── studyRoom.controller.ts
│   ├── summary.controller.ts
│   ├── voiceRoom.controller.ts
│   └── workspace.controller.ts
├── middleware/
│   └── auth.middleware.ts
├── routes/
│   ├── analytics.routes.ts
│   ├── auth.routes.ts
│   ├── chatie.routes.ts
│   ├── flashcard.routes.ts
│   ├── quiz.routes.ts
│   ├── resource.routes.ts
│   ├── studyRoom.routes.ts
│   ├── summary.routes.ts
│   └── workspace.routes.ts
├── services/
│   ├── analytics.service.ts
│   ├── email.service.ts
│   ├── flashcard.service.ts
│   ├── profile.service.ts
│   ├── quiz.service.ts
│   ├── resource.service.ts
│   ├── studyRoom.service.ts
│   ├── studyRoomAI.service.ts
│   ├── studyRoomRealtime.service.ts
│   ├── studyRoomResources.service.ts
│   ├── summary.service.ts
│   ├── voiceRoom.service.ts
│   └── workspace.service.ts
├── types/
│   └── express.d.ts
├── utils/
│   ├── nameGenerator.ts
│   ├── openRouterClient.ts
│   ├── slugGenerator.ts
│   └── studyRoomBadges.ts
└── __tests__/
    ├── setup.ts
    ├── helpers/
    │   ├── createTestApp.ts
    │   ├── mockProcess.ts
    │   └── queryChain.ts
    ├── integration/
    │   ├── flashcards.integration.test.ts
    │   ├── quiz.integration.test.ts
    │   ├── resources.integration.test.ts
    │   ├── studyRoom.integration.test.ts
    │   └── summary.integration.test.ts
    └── unit/
        ├── auth.middleware.unit.test.ts
        ├── flashcard.service.unit.test.ts
        ├── quiz.service.unit.test.ts
        ├── resource.service.unit.test.ts
        ├── studyRoomAI.service.unit.test.ts
        ├── studyRoomBadges.unit.test.ts
        └── summary.service.unit.test.ts
```

---

## 3. Auth Pages

### `frontend/src/app/auth/login/page.tsx`
Email/password sign-in + Google OAuth via Supabase. Redirects to `?redirect` param (default `/workspaces`).

```tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/workspaces";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignIn = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : signInError.message
      );
      return;
    }

    router.push(redirectTo);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setIsGoogleLoading(false);
  };

  // ... JSX
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-105" />}>
      <LoginPageContent />
    </Suspense>
  );
}
```

### `frontend/src/app/auth/signup/page.tsx`
Full name + email + password + confirm password. Google OAuth. Passes `full_name` in Supabase `options.data` for the profile trigger.

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  // ...
  const handleSignUp = async (e: { preventDefault(): void }) => {
    // validates fields, password length >= 8
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });
    // if no session → email confirmation required
    // else → router.push("/workspaces")
  };
  // Google OAuth same as login
}
```

---

## 4. Supabase Table Definitions

### `supabase/create_study_room_tables.sql`

Tables: `study_rooms`, `study_room_participants`, `study_room_invites`, `study_room_questions`, `study_room_answers`, `used_questions`. Full RLS policies for each.

- `study_rooms.status` CHECK IN `('waiting', 'in_progress', 'completed')`
- `study_rooms.invite_method` CHECK IN `('otp', 'email')`
- `study_room_invites.status` CHECK IN `('pending', 'accepted')`
- `study_room_answers` has UNIQUE `(question_id, user_id)`

```sql
CREATE TABLE IF NOT EXISTS study_rooms (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  host_id         UUID NOT NULL REFERENCES auth.users(id),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'in_progress', 'completed')),
  invite_method   TEXT NOT NULL
                    CHECK (invite_method IN ('otp', 'email')),
  otp_code        TEXT,
  otp_expires_at          TIMESTAMPTZ,
  question_count          INTEGER NOT NULL DEFAULT 20,
  resource_ids            TEXT[] NOT NULL DEFAULT '{}',
  current_question_order  INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- + study_room_participants, study_room_invites, study_room_questions,
--   study_room_answers, used_questions — with RLS policies
```

### `supabase/alter_study_room_invites_dismissed.sql`

Migration: adds `'dismissed'` to `study_room_invites.status`. Adds RLS SELECT policy so invited users can see their own invites via `email = auth.jwt() ->> 'email'` (required for Realtime postgres_changes).

```sql
ALTER TABLE study_room_invites
  DROP CONSTRAINT IF EXISTS study_room_invites_status_check;

ALTER TABLE study_room_invites
  ADD CONSTRAINT study_room_invites_status_check
  CHECK (status IN ('pending', 'accepted', 'dismissed'));

CREATE POLICY study_room_invites_select_invited ON study_room_invites
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));
```

### `supabase/create_flashcards_tables.sql`

Tables: `flashcard_sets` (workspace_id, user_id, source_ids UUID[], card_count, status IN `pending/processing/ready/failed`), `flashcards` (set_id, front, back, position, status IN `unknown/known/review`).

### `supabase/create_quiz_tables.sql`

Tables: `quizzes` (question_type IN `mcq/scenario/mixed`, status), `quiz_questions` (JSONB options, correct_option_id TEXT, topic_tag), `quiz_attempts` (JSONB answers, score, total, completed_at).

### `supabase/create_summaries_table.sql`

Table: `summaries` (workspace_id, resource_id nullable → per-resource or workspace-wide, format IN `bullet/short/detailed`, source_ids UUID[], status).

### `supabase/create_chatie_tables.sql`

- `resource_embeddings`: 768-dim `extensions.vector` column with ivfflat cosine index (`lists=100`).
- `chat_history`: role IN `('user', 'assistant')`, sources JSONB for assistant messages.
- RPC `match_resource_embeddings`: cosine similarity search with optional `filter_resource_ids`.

```sql
CREATE OR REPLACE FUNCTION match_resource_embeddings(
  query_embedding     extensions.vector,
  filter_workspace_id UUID,
  filter_resource_ids UUID[]  DEFAULT '{}',
  match_count         INTEGER DEFAULT 5
)
RETURNS TABLE (id UUID, resource_id UUID, chunk_index INTEGER, chunk_text TEXT, similarity FLOAT)
-- uses: 1 - (re.embedding <=> query_embedding) AS similarity
```

### `supabase/create_profile_trigger.sql`

Trigger `on_auth_user_created` on `auth.users` → `handle_new_user()` INSERTs into `public.profiles`, coalescing `full_name` / `name` (Google) / email prefix as fallback. `ON CONFLICT (id) DO NOTHING`.

---

## 5. Study Room Frontend

### Pages

| Route | File | Description |
|---|---|---|
| `/study-rooms` | `app/study-rooms/page.tsx` | Requires `?from=<workspaceId>`, renders `<StudyRoomLanding>` |
| `/study-rooms/[roomId]/lobby` | `app/study-rooms/[roomId]/lobby/page.tsx` | Loads room by ID, renders `<StudyRoomLobby>` |
| `/study-rooms/[roomId]/session` | `app/study-rooms/[roomId]/session/page.tsx` | Renders `<StudyRoomQuiz>` |
| `/study-rooms/[roomId]/results` | `app/study-rooms/[roomId]/results/page.tsx` | Renders `<StudyRoomResults>` |
| `/study-rooms/invite/[token]` | `app/study-rooms/invite/[token]/page.tsx` | Email invite accept flow; redirects to login if unauthenticated |

### Layout (`app/study-rooms/layout.tsx`)

Full-screen dark layout with `<Grainient>` background, sticky header with back-link to workspace (fetches workspace name from `?from` param), "Study Room" label.

### Components

#### `StudyRoomLanding.tsx`
- Lists **Recent Rooms** and **My Hosted Rooms** in a 2-column grid.
- **Right sidebar**: stats (hosted count, played count, total points) + pending invitations panel.
- Supabase Realtime: subscribes to `study_room_invites` (INSERT/UPDATE filtered by user email) and `study_rooms` (UPDATE filtered by workspace_id).
- Modals: **CreateRoomModal** + **Join by Code** (6-digit OTP) + delete confirmation.

#### `StudyRoomLobby.tsx`
- Displays OTP code as large digit tiles (copy button) for OTP rooms.
- Participant list with host crown badge and online/offline status.
- Supabase broadcast listener for `participant:joined`, `participant:disconnected`, `quiz:started`.
- On `quiz:started`: stores first question in `sessionStorage` then navigates to `/session`.
- Host-only: "Add Friends" button opens email invite modal (`sendLobbyInvites`).
- Host-only: "Start Room" button (disabled until ≥ 2 participants) with tooltip.
- Includes `<VoicePanel>`.

#### `StudyRoomQuiz.tsx`
- `useReducer` state machine with actions: `SET_QUESTION`, `SELECT_ANSWER`, `CONFIRM_ANSWER`, `REVEAL_ANSWER`, `NEXT_QUESTION`.
- `normaliseQuestion()` handles both object `{A,B,C,D}` and array options formats.
- Broadcast listener for `answer:confirmed` (tracks who confirmed per participant), `question:next` (reveals answer, delays 2.5s then advances), `room:ended` (navigates to results).
- Host-only "Next Question" button enabled only when `allConfirmed === true`.
- Answer options styled: correct = green, wrong = red, after reveal.

#### `StudyRoomResults.tsx`
- Leaderboard with gold/silver/bronze medal styling via `framer-motion`.
- Badges grid (icon + label).
- AI Insights section (fetched from `getInsights(roomId)`).
- Collapsible "Review Wrong Answers" section with per-question breakdown.

#### `CreateRoomModal.tsx`
- 2-step modal: **setup** → **confirmation**.
- Setup: title (required), description (optional), question count (min 20), resource selector (filtered to `status === 'ready'`), invite method toggle (OTP / Email).
- Email method: add multiple emails with Enter key or + button, list with remove.
- Confirmation: shows OTP digits or email-sent message, "Go to Lobby" button.

#### `RoomCard.tsx`
- Display card: title, status badge (Completed/In Progress/Waiting), formatted date, participant count, score progress bar.
