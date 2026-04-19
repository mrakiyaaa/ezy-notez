# Study Room Database Schema

## Overview

Six tables supporting real-time multiplayer study sessions (quiz-style rooms) where a host generates questions from workspace resources and participants compete to answer them.

## Migration file

`supabase/create_study_room_tables.sql`

## Tables

### study_rooms
Top-level room record owned by a host.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| workspace_id | uuid FK → workspaces | cascade delete |
| host_id | uuid FK → auth.users | |
| title | text | |
| description | text | nullable |
| status | text | `waiting` \| `in_progress` \| `completed` |
| invite_method | text | `otp` \| `email` |
| otp_code | text | nullable; set when invite_method = otp |
| otp_expires_at | timestamptz | nullable |
| question_count | integer | default 20 |
| resource_ids | text[] | stored at creation; used by startRoom |
| current_question_order | integer | default 0; incremented by nextQuestion |
| created_at | timestamptz | default now() |

### study_room_participants
One row per user who has joined a room.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| room_id | uuid FK → study_rooms | cascade delete |
| user_id | uuid FK → auth.users | |
| is_host | boolean | default false |
| joined_at | timestamptz | default now() |

Unique constraint: `(room_id, user_id)`

### study_room_invites
Email-based invite tokens issued by the host.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| room_id | uuid FK → study_rooms | cascade delete |
| email | text | |
| token | text | unique |
| status | text | `pending` \| `accepted` |
| created_at | timestamptz | default now() |

### study_room_questions
AI-generated MCQ questions for a specific room.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| room_id | uuid FK → study_rooms | cascade delete |
| question | text | |
| options | jsonb | array of answer options |
| correct_answer | text | |
| explanation | text | |
| order_index | integer | display order |
| created_at | timestamptz | default now() |

### study_room_answers
Each participant's answer to each question.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| room_id | uuid FK → study_rooms | cascade delete |
| question_id | uuid FK → study_room_questions | cascade delete |
| user_id | uuid FK → auth.users | |
| selected_answer | text | |
| is_correct | boolean | |
| points_earned | integer | default 0 |
| answered_at | timestamptz | default now() |

Unique constraint: `(question_id, user_id)`

### used_questions
Hashes of previously used questions per workspace, to avoid repeats.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK → workspaces | cascade delete |
| question_hash | text | |
| created_at | timestamptz | default now() |

Unique constraint: `(workspace_id, question_hash)`

## Indexes

| Index | Columns |
|---|---|
| idx_study_rooms_workspace | study_rooms(workspace_id) |
| idx_study_rooms_host | study_rooms(host_id) |
| idx_study_room_participants_room | study_room_participants(room_id) |
| idx_study_room_participants_user | study_room_participants(user_id) |
| idx_study_room_answers_room_question | study_room_answers(room_id, question_id) |
| idx_used_questions_workspace | used_questions(workspace_id) |

## RLS Policies

RLS is enabled on all six tables.

| Table | Operation | Who |
|---|---|---|
| study_rooms | SELECT | host OR participant |
| study_rooms | INSERT | authenticated (host_id must equal auth.uid()) |
| study_rooms | UPDATE | host only |
| study_room_participants | SELECT | participants in the same room |
| study_room_participants | INSERT | authenticated |
| study_room_invites | SELECT | host only |
| study_room_invites | INSERT | host only |
| study_room_invites | UPDATE | authenticated (to accept) |
| study_room_questions | SELECT | room participants |
| study_room_questions | INSERT | host only |
| study_room_answers | SELECT | room participants |
| study_room_answers | INSERT | row owner (auth.uid() = user_id) |
| used_questions | SELECT | workspace owner |
| used_questions | INSERT | authenticated |

## TypeScript types

DB-row interfaces live in `frontend/src/types/studyRoom.ts`:

- `StudyRoomRow`
- `StudyRoomParticipantRow`
- `StudyRoomInviteRow`
- `StudyRoomQuestionRow`
- `StudyRoomAnswerRow`
- `UsedQuestionRow`

Union types: `RoomStatus`, `InviteStatus`, `InviteMethod`
