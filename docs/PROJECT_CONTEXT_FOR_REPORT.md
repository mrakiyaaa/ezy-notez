# EZY Notez — Project Context for Final Year Report

> Self-contained context dossier compiled from the codebase for the PUSL3190
> final-year project report (10,000 words). Every fact in this document is
> traceable to a file path or document quoted inline. Items that could not be
> verified from the codebase are marked **TBD — needs Akila input**.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project name** | EZY Notez |
| **Tagline** | "Transform your documents, audio & videos into quizzes, flashcards and summaries — powered by AI." (`README.md:7`) |
| **One-line description** | AI-powered academic learning platform that ingests university course materials (PDF / PPTX / DOCX / audio / YouTube) and generates summaries, flashcards, quizzes, and a workspace-scoped RAG chatbot, with a real-time multiplayer Study Room mode. |
| **Module code** | PUSL3190 |
| **University** | University of Plymouth (delivered through partner institution — **TBD — needs Akila input** for partner name and campus) |
| **Author** | Akila Lakshitha (git user `mrakiyaaa`, email `akilalakshitha572@gmail.com`) |
| **Supervisor** | **TBD — needs Akila input** |
| **Repository** | `git+https://github.com/mrakiyaaa/ezy-notez.git` (`package.json:23`) |
| **License** | ISC (`package.json:27`) |
| **Status** | Active development (per `README.md:670`) |

### Repository Structure (top level)

| Path | Purpose |
|---|---|
| [frontend/](frontend/) | Next.js 16 / React 19 web client |
| [backend/](backend/) | Express.js 5 REST API (TypeScript) |
| [services/ml/](services/ml/) | Unified FastAPI ML microservice (Quiz + Chattie + Flashcards) |
| [supabase/](supabase/) | SQL migration files for the Postgres schema |
| [documents/](documents/) | Per-feature implementation docs maintained alongside the code |
| [docs/](docs/) | This report-context dossier |
| [.github/](.github/) | GitHub Actions workflows (E2E pipeline) |
| [.husky/](.husky/) | Git hooks |
| `docker-compose.dev.yml` / `docker-compose.prod.yml` | Local orchestration of all three services |
| `requirements.txt` | Root Python deps for the audio / scripts pipeline |

---

## 2. Problem Statement & Motivation

### Problem

University students manage an unmanageable amount of unstructured study material across many formats — lecture slides (PPTX), handouts (PDF / DOCX), recorded lectures (audio), and supplementary YouTube videos. Converting that material into the artefacts that actually drive revision (summaries, flashcards, practice questions) is manual, time-consuming, and rarely consistent across modules. Generic AI tools (ChatGPT, Notion AI) sit outside the student's study material, force the student to copy-paste context, and offer no shared collaborative revision space.

### Target Users

- Undergraduate university students preparing for coursework and exams
- Study groups who want to revise the same material together in real time
- Students who learn best from active recall (flashcards, quizzes) rather than passive re-reading

### Existing Tools and Their Gaps

| Tool / Class | Gap addressed by EZY Notez |
|---|---|
| ChatGPT / generic LLMs | Stateless; no persistent connection to the user's actual study material; no flashcards, no quiz attempts, no progress tracking |
| Notion AI / Obsidian | Note-taking first; not designed to ingest audio / PPTX / YouTube end-to-end and synthesise quizzes |
| Quizlet | Manual flashcard authoring; no AI generation from arbitrary source material |
| Anki | Powerful but no AI; no built-in collaborative real-time mode |
| Otter.ai / similar | Transcribes audio but does not turn the transcript into study artefacts |

EZY Notez positions itself as an **integrated study workspace**: upload once, generate everything (summaries, flashcards, quizzes, RAG chat) against the same workspace, and share that workspace as a real-time multiplayer Study Room.

---

## 3. Objectives & Deliverables

### Primary Objectives

1. Provide a single workspace abstraction that ingests heterogeneous academic content (PDF / PPTX / DOCX / audio / YouTube) and exposes a unified `extracted_text` representation that all downstream features consume.
2. Generate AI-driven study artefacts from that text — summaries, flashcards, MCQ / scenario quizzes — without requiring the student to copy-paste content into a third-party LLM.
3. Provide a workspace-scoped RAG chatbot (Chattie) so the student can ask natural-language questions and receive answers grounded in their own material.
4. Provide a real-time multiplayer Study Room so students can compete on AI-generated questions drawn from a shared workspace.
5. Enforce strict per-user data isolation via Supabase Row Level Security on every table.

### Functional Features Delivered

- Authentication (Supabase Auth, JWT + cookie fallback)
- Workspace management with 8-aura colour theming and slug routing (`README.md:53`)
- Multi-format resource upload + automatic text extraction (PDF / PPTX / DOCX / audio / YouTube)
- AI Summarization in three formats (bullet / short / detailed) — General and Customize modes (`documents/summarization-openrouter-migration.md`)
- AI Flashcard generation via extractive NLP, with study mode and Known / Review-Later progress (`documents/flashcards-implementation.md`)
- AI Quiz generation (MCQ / Scenario / Mixed) with attempts, incremental answer persistence, and topic accuracy breakdown (`documents/quiz-implementation.md`)
- Animated Teddy Bear companion with six emotion states reacting to quiz progress (`documents/quiz-implementation.md` §Bear Emotions)
- Chattie — workspace-scoped RAG chatbot with chat-history persistence and source-chunk citations (`documents/chatie-rag-implementation.md`)
- Study Rooms — host / participants / OTP & email invites / live quiz / leaderboard / AI weak-topic insights / voice channel (`documents/study-room-backend.md`, `documents/voice-chat-webrtc.md`)
- Profile drawer & settings page

### Non-Functional Requirements Addressed

| NFR | How addressed |
|---|---|
| **Security — data isolation** | Supabase RLS on every table; service-role key only used server-side (never exposed to browser); auth middleware validates and refreshes JWTs on every protected request (`README.md:534`) |
| **Security — assessment validity** | `correct_option_id` for quizzes is never returned in GET responses; correct answer is resolved server-side at scoring time (`README.md:538`) |
| **Performance — generation latency** | Quiz pipeline shifted from local 1 GB T5 model (10–30 s cold start) to a stateless OpenRouter call (instant startup); flashcards run in 1–3 s on CPU via extractive NLP |
| **Scalability** | Stateless ML service; pgvector ivfflat index for similarity search; fire-and-forget background jobs return `pending` immediately and update status via polling |
| **UX** | Glassmorphism design system; Framer Motion animation; per-workspace aura colour scoped to indicators only (`documents/aura-theme-removal.md`); resource status polling (uploading → indexing → ready) |
| **Reliability** | E2E tests run on Vercel preview before merge; backend Jest tests mock all external I/O; Playwright retries absorb Railway cold-start flakiness |

---

## 4. Tech Stack (exhaustive)

### Frontend

| Item | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | App Router, SSR, routing (`frontend/package.json:26`) |
| React | 19.2.3 | UI runtime |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Utility-first styling |
| `@tailwindcss/postcss` | ^4 | PostCSS integration |
| `tw-animate-css` | ^1.4.0 | Animation utilities |
| shadcn / radix-ui | shadcn ^3.8.4, radix-ui ^1.4.3 | Headless component primitives |
| Framer Motion | ^12.38.0 | Animation library (Lottie wrapper, transitions) |
| Lottie | `lottie-react` ^2.4.1, `@lottiefiles/dotlottie-react` ^0.19.0 | Teddy bear and avatar animations |
| Lucide React | ^0.564.0 | Icon set |
| Three.js | ^0.167.1 | 3D background visuals |
| OGL | ^1.0.11 | Lightweight WebGL primitives (`LiquidEther` background) |
| Zustand | ^4.4.7 | Client state management |
| Axios | ^1.6.2 | HTTP client (Express API) |
| `react-markdown` | ^10.1.0 | Renders Markdown summaries and chat replies |
| `class-variance-authority` / `clsx` / `tailwind-merge` | latest | Conditional class composition |
| `socket.io-client` | ^4.6.0 | Reserved for realtime socket fallback (Supabase Realtime is primary) |
| `@supabase/ssr` ^0.8.0, `@supabase/supabase-js` ^2.97.0 | Supabase client (browser + middleware) |
| `uploadthing` ^7.7.4, `@uploadthing/react` ^7.3.3 | File upload UX + handler |
| Playwright | ^1.59.1 | E2E testing |
| ESLint 9, `eslint-config-next` | dev | Linting |

### Backend — Express service (`backend/package.json`)

| Item | Version | Purpose |
|---|---|---|
| Express | ^5.2.1 | HTTP server |
| TypeScript | ^5.7.3 | Type-safe source |
| `ts-node-dev` | ^2.0.0 | Hot-reload dev server (`npm run dev`) |
| `@supabase/supabase-js` | ^2.95.3 | Server-side Supabase client (service-role) |
| `@supabase/ssr` | ^0.8.0 | Cookie-aware client used by middleware |
| `axios` | ^1.7.9 | Calls to ML microservice + OpenRouter |
| `pg` | ^8.13.3 | Direct Postgres access (used where Supabase client is insufficient) |
| `pdf-parse` | ^2.4.5 | PDF text extraction in-process |
| `cors` ^2.8.5, `cookie-parser` ^1.4.7 | Standard HTTP middleware |
| `dotenv` | ^16.4.7 | Env loading |
| `resend` | ^6.12.0 | Transactional email (Study Room invites — `email.service.ts`) |
| `uploadthing` | ^7.7.4 | Server-side UploadThing handler |
| Jest + `ts-jest` | ^29.x | Unit + integration tests |
| Supertest | ^7.0.0 | HTTP assertions in integration tests |

### Backend — FastAPI ML service (`services/ml/requirements.txt`)

| Item | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.0 | Async HTTP framework |
| Uvicorn (with standard extras) | 0.30.0 | ASGI server |
| Pydantic | 2.9.0 | Request / response models |
| `python-dotenv` | 1.0.1 | Env loading |
| `httpx` | 0.27.2 | Outbound calls to OpenRouter / Gemini |
| NLTK | 3.9.1 | Sentence tokenisation, POS tagging (quiz preproc + flashcards) |
| `supabase` (Python) | 2.11.0 | Direct Supabase access from ML service |
| `google-genai` | >=1.0.0 | Gemini embeddings + chat completion |
| `tiktoken` | 0.8.0 | Token counting for chunking |

### Root Python scripts (`requirements.txt`)

| Item | Purpose |
|---|---|
| `openai-whisper` | Audio transcription via Whisper `tiny` |
| `python-pptx` | PPTX text extraction |
| `requests` | HTTP fetching (audio downloads) |
| `youtube-transcript-api` | YouTube transcript extraction |
| `transformers`, `torch`, `sumy`, `nltk` | Legacy summarization pipeline (now replaced by OpenRouter — kept for fallback / scripts) |

### Database

| Item | Purpose |
|---|---|
| Supabase Postgres | Primary OLTP store |
| `pgvector` extension | 768-dim embedding storage + cosine similarity search (`resource_embeddings`) |
| Supabase RPC (`match_resource_embeddings`) | Server-side vector match function used by Chattie |

### AI / ML — full inventory

| Layer | Technology | Where used |
|---|---|---|
| Quiz generation | OpenRouter API → `meta-llama/llama-3.1-8b-instruct` | `services/ml/quiz/pipeline.py` |
| Summarization | OpenRouter API → `meta-llama/llama-3.1-8b-instruct` | `backend/src/services/summary.service.ts` |
| Study Room question gen + insights | OpenRouter API → `google/gemini-flash-1.5` | `backend/src/services/studyRoomAI.service.ts` |
| Chattie chat | Gemini `gemini-2.0-flash` (Google AI Studio) | `services/ml/chatie/router.py` |
| Chattie embeddings | Gemini `text-embedding-004` (768-dim) | `services/ml/chatie/embeddings.py` |
| Audio transcription | OpenAI Whisper `tiny` (local, ~75 MB, runs on CPU) | `backend/scripts/whisper_transcribe.py` |
| Flashcard generation | Extractive NLP via NLTK (TF-IDF, POS tagging, pattern questions) | `backend/scripts/generate_flashcards.py` |
| Quiz preprocessing | NLTK `punkt_tab` sentence segmentation + rule-based scrubbers | `services/ml/quiz/pipeline.py` Stage 1 |
| YouTube transcript | `youtube-transcript-api` | `backend/scripts/youtube_transcript.py` |
| PPTX extraction | `python-pptx` | `backend/scripts/pptx_extract.py` |
| PDF extraction | `pdf-parse` (Node, in-process) | `backend/src/services/resource.service.ts` |

### Authentication

| Item | Purpose |
|---|---|
| Supabase Auth (email + password) | Primary auth provider; JWT issued via cookies + Bearer tokens |
| `auth.middleware.ts` | Validates the access token, falls back to cookie, refreshes token on expiry |
| Profile trigger (`supabase/create_profile_trigger.sql`) | Inserts a profile row on user signup |

### File Storage

| Item | Purpose |
|---|---|
| UploadThing (`uploadthing` + `@uploadthing/react`) | Frontend uploader UI + signed-URL hosting for raw resources |
| Supabase storage | Not used directly for resource files; UploadThing is the source of truth |

### Email

| Item | Purpose |
|---|---|
| Resend (`resend` ^6.12.0) | Study Room email invites; transactional emails |

### Real-time

| Item | Purpose |
|---|---|
| Supabase Realtime | Study Room broadcasts (`participant:joined`, `quiz:started`, `answer:confirmed`, `question:next`, `room:ended`) — channel pattern `study-room:{roomId}` |
| `socket.io-client` (frontend) | Imported but Supabase Realtime is the primary transport — **TBD — needs Akila input** to confirm whether Socket.IO is used in production |

### Testing Tools

| Item | Purpose |
|---|---|
| Jest + `ts-jest` (`backend`) | Unit and integration tests for the Express API |
| Supertest (`backend`) | HTTP assertion helper |
| Playwright (`frontend/tests/e2e/`) | End-to-end browser tests against deployed services |
| `dorny/test-reporter` | PR annotations from JUnit output |
| `patrickedqvist/wait-for-vercel-preview` | Resolves preview URL on PR runs |

### Deployment Platforms

| Service | Host |
|---|---|
| Frontend (Next.js) | Vercel (`VERCEL_PRODUCTION_URL` secret in CI) |
| Express API | Railway (Docker, `node:20-alpine`) |
| FastAPI ML | Railway (Docker, `python:3.10-slim` with pre-baked Whisper + NLTK data) |
| Database / Auth | Supabase (managed Postgres + pgvector + Auth) |
| File hosting | UploadThing |

### DevOps / CI

| Item | Purpose |
|---|---|
| GitHub Actions (`.github/workflows/e2e.yml`) | Playwright E2E pipeline — PR (preview), push to main (prod), manual dispatch with `run_slow` toggle |
| Husky | Git hooks (`.husky/`) |
| `concurrently` | Boots all three services with one command (`npm run dev`) |
| Docker Compose (dev / prod) | Local orchestration with hot reload (dev) and multi-stage builds (prod) |

---

## 5. System Architecture

### High-Level Diagram (verbatim from `README.md:133-158`)

```
┌─────────────────────────────────────────────────────────┐
│                 Browser (Next.js 16)                     │
│           React 19 · Tailwind 4 · Zustand                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / REST
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Express.js Backend  :3001                   │
│      Auth Middleware · Controllers · Services            │
└───────┬──────────────┬────────────────────┬─────────────┘
        │              │                    │
        ▼              ▼                    ▼
┌──────────────┐ ┌───────────────┐  ┌─────────────────────┐
│   Supabase   │ │ Python Scripts│  │  FastAPI ML  :8000  │
│  PostgreSQL  │ │ child_process │  │                     │
│  + pgvector  │ │ .spawn        │  │  /quiz   OpenRouter │
│  + Auth      │ │ summarize_…   │  │  /chatie Gemini RAG │
│  + RLS       │ │ whisper_…     │  │                     │
└──────────────┘ │ flashcards_…  │  └─────────────────────┘
                 └───────────────┘
```

### Service Responsibilities

| Service | Responsibility |
|---|---|
| Next.js frontend | UI, auth flow, polling, optimistic UX, Supabase Realtime subscription |
| Express backend | REST API, auth middleware, controllers/services, fire-and-forget orchestration of Python scripts and FastAPI calls, Supabase writes, server-side scoring |
| FastAPI ML | Stateless AI microservice — `/quiz/*`, `/chatie/*`, plus a flashcards router (`services/ml/routers/flashcards.py`) |
| Python scripts (`backend/scripts/`) | Spawned by the Express backend via `child_process.spawn` for tasks that don't need a long-running service (Whisper transcription, PPTX extraction, YouTube transcript, NLTK flashcard generation) |

### Data Flow per Major Feature

| Feature | Flow |
|---|---|
| **Resource upload** | Browser → UploadThing direct upload → callback → Express `POST /api/resources` (sets `status=uploading`) → background extraction (PDF in-process / Python script for audio/PPTX/YouTube) → `status=ready` → Express fires-and-forgets to FastAPI `/chatie/embed-resource` for embedding |
| **Summary** | Browser → Express `POST /api/summaries/{general,custom}` → row inserted with `status=pending` → background pipeline calls OpenRouter directly (Llama 3.1 8B) → `status=ready/failed` → frontend polls |
| **Flashcards** | Browser → Express `POST /api/flashcards/generate` → row inserted `status=pending` → spawns `generate_flashcards.py` → cards inserted → `status=ready` |
| **Quiz** | Browser → Express `POST /api/quiz/generate` → row inserted `status=pending` → fire-and-forget POST to FastAPI `/quiz/generate-quiz` → ML returns questions → backend writes to `quiz_questions` → `status=ready` |
| **Chattie chat** | Browser → Express `/api/chatie/chat` → FastAPI `/chatie/chat` → embed query (Gemini) → pgvector RPC `match_resource_embeddings` → top-5 chunks fed to Gemini 2.0 Flash → reply written to `chat_history` |
| **Study Room** | Browser → Express `/api/study-rooms/*` → questions generated via OpenRouter (Gemini Flash 1.5) and de-duplicated against `used_questions` hashes → answers and progression broadcast via Supabase Realtime channel `study-room:{roomId}` |

### Architecture Rationale

| Choice | Rationale (from project docs) |
|---|---|
| **Express + FastAPI split** | Express handles auth, business logic, and CRUD where Node ecosystems are mature (Supabase JS SDK, UploadThing, Resend). Python is the natural home for AI/ML libraries (NLTK, Whisper, Gemini SDK) — keeping it in a dedicated service avoids Node/Python interop pain inside Express handlers. |
| **Unified ML service** (Quiz + Chattie + Flashcards) | Originally two separate FastAPI services on `:8001` and `:8002`. Merged into one container on `:8000` to halve Railway cost, share Python tooling, and reduce the backend to a single `PYTHON_ML_URL` env var (`documents/railway-deployment/RAILWAY_DEPLOYMENT.md`). |
| **Python `child_process.spawn`** for scripts (not service calls) | Whisper / PPTX / YouTube extraction are one-shot per-resource jobs with no warm state. Spawning a short-lived process avoids tying up the FastAPI worker pool and keeps the script logic simple. |
| **Supabase as one-stop platform** | Postgres + Auth + RLS + Realtime + pgvector all behind one provider; aligns with a final-year-project budget and removes the need to integrate four separate vendors. |

---

## 6. Core Features

### 6.1 AI Summarization

- **What it does:** Generates a workspace-wide summary (General mode) or per-resource summaries (Customize mode) in three formats: Bullet Points, Short paragraph, or Detailed multi-paragraph. Output is rendered as Markdown.
- **How it works:**
  - Express `POST /api/summaries/general` (or `/custom`) inserts a `summaries` row with `status=pending` and returns immediately.
  - Background pipeline in `summary.service.ts`:
    - **General mode**: Pass 1 — summarize each resource individually via OpenRouter; Pass 2 — combine the intermediates into a single cohesive summary.
    - **Customize mode**: Summarize each selected resource independently in parallel.
  - Updates row `status=ready/failed`, frontend polls every few seconds.
- **Models / APIs:** OpenRouter API → `meta-llama/llama-3.1-8b-instruct` at temperature 0.3 (deterministic for academic content), 60 s timeout.
- **Key files:**
  - [backend/src/services/summary.service.ts](backend/src/services/summary.service.ts)
  - [backend/src/controllers/summary.controller.ts](backend/src/controllers/summary.controller.ts)
  - [backend/src/routes/summary.routes.ts](backend/src/routes/summary.routes.ts)
  - [frontend/src/components/workspace/SummarizationView.tsx](frontend/src/components/workspace/SummarizationView.tsx)
- **Limitations:** Two-pass General mode multiplies API calls by `n+1` for n resources; capped resource text length (Stage 1 truncation reused) constrains very long inputs.

### 6.2 Flashcard Generation

- **What it does:** Generates a flashcard set (5–20 cards) from selected resources with optional topic focus. Cards have a front (question) and back (answer); the user marks each as Known / Review-Later, and progress persists.
- **How it works (extractive NLP):**
  1. Combine `extracted_text` from selected resources.
  2. Sentence-tokenise and filter to 8–60 word sentences.
  3. TF-IDF score sentences for importance.
  4. Classify each sentence (definition, cause/effect, process, comparison, example, purpose).
  5. Apply type-based bonus + optional topic-relevance scoring.
  6. POS-tag to extract subject noun phrases.
  7. Generate pattern-based questions matched to sentence type.
  8. Build answers from key sentences + neighbouring context.
  9. Deduplicate by subject and validate.
- **Performance:** ~1–3 s for 10 cards on CPU.
- **Models / APIs:** None remote — pure NLTK. (Earlier iteration used FLAN-T5 locally; replaced 2026-04-02 — see `documents/flashcards-implementation.md` Changelog.)
- **Key files:**
  - [backend/scripts/generate_flashcards.py](backend/scripts/generate_flashcards.py)
  - [backend/src/services/flashcard.service.ts](backend/src/services/flashcard.service.ts)
  - [services/ml/routers/flashcards.py](services/ml/routers/flashcards.py)
  - [frontend/src/components/workspace/FlashcardsView.tsx](frontend/src/components/workspace/FlashcardsView.tsx)
  - [frontend/src/components/workspace/flashcards/StudyMode.tsx](frontend/src/components/workspace/flashcards/StudyMode.tsx)
- **Limitations:** Pattern-based questions occasionally produce shallow definitions; no spaced-repetition algorithm yet.

### 6.3 Quiz Generation

- **What it does:** Generates 5/10/15/20 MCQ, Scenario, or Mixed questions with four options, a correct answer ID, an explanation, and a topic tag. Attempts are persisted incrementally; results show pass/fail (≥60%), per-topic accuracy breakdown, and per-question explanations. An animated Teddy Bear mirrors quiz state with six emotions.
- **How it works (current — full OpenRouter pipeline):**
  - **Stage 1 (local):** NLTK preprocessing — line-level filters drop slide-title fragments, file paths, ALL-CAPS headers, presenter names, agenda lines; token scrubbers replace URLs / paths / filenames / names; truncate to 3 000 chars on a sentence boundary.
  - **Stage 2 (remote):** Single POST to OpenRouter chat-completions, model `meta-llama/llama-3.1-8b-instruct`, temperature 0.7 (retry at 0.9), 30 s timeout. The prompt asks for `max(question_count + 2, ⌊count × 1.5⌋)` items so the quality filter has slack.
  - **Stage 3 (local):** Strip Markdown fences, extract first JSON array, validate each item (4 options, non-empty, type), resolve `correct_index` via three-strategy matcher (integer → letter/string → text match). Assign fresh UUIDs and labels A/B/C/D **after** validation — `correct_option_id` is correct **by construction**.
  - **Stage 4 (local):** `is_valid_question` gate (≥8 words, no embedded `?`, distinct distractors); Jaccard ≥0.7 deduplication; top-N selection.
- **Models / APIs:** OpenRouter → `meta-llama/llama-3.1-8b-instruct`. NLTK `punkt_tab` for tokenisation.
- **Key files:**
  - [services/ml/quiz/pipeline.py](services/ml/quiz/pipeline.py)
  - [services/ml/quiz/router.py](services/ml/quiz/router.py)
  - [services/ml/quiz/models.py](services/ml/quiz/models.py)
  - [backend/src/services/quiz.service.ts](backend/src/services/quiz.service.ts)
  - [frontend/src/components/workspace/QuizAttemptView.tsx](frontend/src/components/workspace/QuizAttemptView.tsx)
  - [frontend/src/components/workspace/quiz/TeddyCompanion.tsx](frontend/src/components/workspace/quiz/TeddyCompanion.tsx)
- **Limitations:** Depends on OpenRouter availability and free-tier rate limits; Stage 2 prompt cap of 3 000 chars limits very long single resources; pass threshold is hard-coded at 60%.

### 6.4 Chattie (RAG Chatbot)

- **What it does:** Workspace-scoped conversational AI. The user picks resources (all selected by default) and asks natural-language questions; replies cite source chunks.
- **How it works:**
  1. When a resource reaches `status=ready`, Express fires-and-forgets to FastAPI `/chatie/embed-resource`.
  2. ML service chunks the text (~500 tokens, 50 token overlap) and embeds each chunk via Gemini `text-embedding-004` (768-dim). Old embeddings for that `resource_id` are deleted, new ones inserted.
  3. On a chat turn: query embedded with `text-embedding-004` (RETRIEVAL_QUERY task type) → pgvector cosine similarity (RPC `match_resource_embeddings`) returns top 5 chunks → system prompt + chunks + user message sent to `gemini-2.0-flash`.
  4. Both user and assistant turns are written to `chat_history` with `sources` JSONB on assistant rows.
- **Models / APIs:** Gemini `text-embedding-004`, Gemini `gemini-2.0-flash` (Google AI Studio).
- **Key files:**
  - [services/ml/chatie/router.py](services/ml/chatie/router.py)
  - [services/ml/chatie/embeddings.py](services/ml/chatie/embeddings.py)
  - [services/ml/chatie/db.py](services/ml/chatie/db.py)
  - [backend/src/controllers/chatie.controller.ts](backend/src/controllers/chatie.controller.ts)
  - [frontend/src/components/workspace/Chattie.tsx](frontend/src/components/workspace/Chattie.tsx)
- **Limitations:** Top-K is fixed at 5; no reranking; no message-history truncation policy documented.

### 6.5 Study Rooms

- **What it does:** Real-time multiplayer quiz sessions decoupled from workspace UI (route group `frontend/src/app/study-rooms/`). Four URL-addressable stages: landing → lobby → live quiz → results. Hosts invite participants via 6-digit OTP (10-minute expiry), email invite token, or shareable link. Lobby includes a voice channel built on Supabase Realtime + WebRTC. A `?from=` query param carries the originating workspace.
- **How it works:**
  - Host creates a room via `POST /api/study-rooms/` — DB row in `study_rooms` with chosen `invite_method` and resource list.
  - Participants join via `/join-by-code`, `/:roomId/join-otp`, or `/invite/:token/accept`.
  - On host start: Express fetches resource text → calls OpenRouter (Gemini Flash 1.5) → SHA-256 hashes the question texts and de-duplicates against `used_questions` rows for that workspace → inserts unique questions into `study_room_questions` → broadcasts `quiz:started`.
  - Each answer triggers a Realtime broadcast `answer:confirmed`; host advances to next question via `POST /:roomId/next` which broadcasts `question:next`.
  - On completion: `room:ended` broadcast; results endpoint returns leaderboard + per-user wrong answers + AI weak-topic insights (`generateInsights`).
- **Models / APIs:** OpenRouter `google/gemini-flash-1.5` for question generation and insights; Supabase Realtime for broadcasts.
- **Key files:**
  - [backend/src/routes/studyRoom.routes.ts](backend/src/routes/studyRoom.routes.ts)
  - [backend/src/services/studyRoom.service.ts](backend/src/services/studyRoom.service.ts)
  - [backend/src/services/studyRoomAI.service.ts](backend/src/services/studyRoomAI.service.ts)
  - [backend/src/services/studyRoomRealtime.service.ts](backend/src/services/studyRoomRealtime.service.ts)
  - [frontend/src/app/study-rooms/](frontend/src/app/study-rooms/)
  - [frontend/src/components/study-room/](frontend/src/components/study-room/)
- **Limitations:** Voice chat is an in-lobby feature (not during quiz); minimum 2 participants required to start; Resend integration is wired through `email.service.ts` but the body of `sendStudyRoomInvite` is described in `study-room-backend.md:106` as a console-log placeholder — **TBD — needs Akila input** to confirm Resend is now sending real emails.

### 6.6 Resource Upload & Processing

- **What it does:** Single uploader that accepts PDF, DOCX, PPTX, audio (MP3/WAV/M4A/WebM/OGG), and YouTube URLs, then extracts text into the unified `extracted_text` column on `resources`. Status transitions: `uploading` → `indexing` → `ready` (or `failed`).
- **How it works:**
  - **PDF**: in-process via `pdf-parse` in `resource.service.ts`.
  - **PPTX**: `child_process.spawn('python', ['pptx_extract.py', fileUrl])`.
  - **DOCX**: **TBD — needs Akila input** — README claims DOCX support but no dedicated script is present in `backend/scripts/`; likely handled via PPTX path or library — verify.
  - **Audio**: `child_process.spawn('python', ['whisper_transcribe.py', fileUrl])` → Whisper `tiny` downloads audio, transcribes, prints transcript to stdout.
  - **YouTube**: `child_process.spawn('python', ['youtube_transcript.py', url])` via `youtube-transcript-api`.
  - On `status=ready`: Express fires-and-forgets to `/chatie/embed-resource` so the resource is searchable in Chattie.
- **Models / APIs:** Whisper `tiny` (local), `youtube-transcript-api`, `python-pptx`, `pdf-parse`.
- **Key files:**
  - [backend/scripts/whisper_transcribe.py](backend/scripts/whisper_transcribe.py)
  - [backend/scripts/pptx_extract.py](backend/scripts/pptx_extract.py)
  - [backend/scripts/youtube_transcript.py](backend/scripts/youtube_transcript.py)
  - [backend/src/services/resource.service.ts](backend/src/services/resource.service.ts)
- **Limitations:** Whisper `tiny` is the smallest model — accuracy degrades on noisy audio; `ffmpeg` must be installed at the OS level for audio decoding; Whisper auto-downloads on first use, so first transcription on a fresh Railway dyno is slow.

---

## 7. Database Schema

All tables live in Supabase Postgres (project URL configured via `SUPABASE_URL`). Migrations in `supabase/` are applied in order.

### Tables (verified from migration files)

| Table | Migration file | Purpose |
|---|---|---|
| `profiles` (via trigger) | `create_profile_trigger.sql` | Auto-inserted on user signup; mirrors `auth.users` |
| `workspaces` | **TBD — needs Akila input** (no `create_workspaces_table.sql` in repo despite `README.md:649` referencing it) | Top-level user-owned study hub |
| `resources` | **TBD — needs Akila input** (no migration file present in `supabase/`) | Uploaded source material |
| `summaries` | `create_summaries_table.sql` | AI-generated summaries |
| `flashcard_sets`, `flashcards` | `create_flashcards_tables.sql` | Flashcard sets and individual cards |
| `quizzes`, `quiz_questions`, `quiz_attempts` | `create_quiz_tables.sql` | Quiz metadata, questions, attempts |
| `resource_embeddings`, `chat_history` | `create_chatie_tables.sql` | RAG embeddings and chat history |
| `study_rooms`, `study_room_participants`, `study_room_invites`, `study_room_questions`, `study_room_answers`, `used_questions` | `create_study_room_tables.sql` | Real-time multiplayer quiz |
| `study_room_invites` (alter) | `alter_study_room_invites_dismissed.sql` | Adds `dismissed` flag |

### Key Relationships

| From | To | On delete |
|---|---|---|
| `summaries.resource_id` | `resources.id` | CASCADE |
| `quiz_questions.quiz_id` | `quizzes.id` | CASCADE |
| `quiz_attempts.quiz_id` | `quizzes.id` | CASCADE |
| `flashcards.set_id` | `flashcard_sets.id` | CASCADE |
| `resource_embeddings.resource_id` | `resources.id` | CASCADE |
| `study_room_*.room_id` | `study_rooms.id` | CASCADE |

### pgvector usage

| Table | Column | Dimension | Index | Distance metric |
|---|---|---|---|---|
| `resource_embeddings` | `embedding` | `vector(768)` | ivfflat | cosine similarity |

The RPC `match_resource_embeddings(workspace_id, resource_ids?, query_embedding, match_count)` performs the actual vector match and returns top-N chunks with similarity scores (`documents/chatie-rag-implementation.md:52-55`).

### Quiz schema highlights (`supabase/create_quiz_tables.sql`)

- `quizzes.status` ∈ {`pending`, `processing`, `ready`, `failed`}
- `quizzes.question_type` ∈ {`mcq`, `scenario`, `mixed`}
- `quiz_questions.options` is JSONB; `correct_option_id` stored as TEXT (UUID generated by Stage 3 of the pipeline)
- `quiz_attempts.answers` is JSONB array of `{ question_id, selected_option_id }`
- `quiz_attempts.status` ∈ {`in_progress`, `completed`}

### Study Room schema highlights (`documents/study-room-schema.md`)

- `study_rooms.status` ∈ {`waiting`, `in_progress`, `completed`}
- `study_rooms.invite_method` ∈ {`otp`, `email`}
- `study_rooms.otp_code` 6-digit numeric, expires after 10 minutes (`otp_expires_at`)
- `study_rooms.current_question_order` advanced by `nextQuestion`
- Unique constraints: `(room_id, user_id)` on participants; `(question_id, user_id)` on answers; `(workspace_id, question_hash)` on `used_questions`
- All six tables have RLS enabled with policies as documented in `study-room-schema.md`

---

## 8. AI / ML Architecture Decisions

This section captures the build-vs-buy and local-vs-API trade-offs Akila made — the most report-worthy part of the engineering work.

### 8.1 Quiz generation: three iterative architectures

Documented in detail in `documents/quiz-ml-backend.md` §4.

| Iteration | Architecture | Why it failed (or didn't) |
|---|---|---|
| **v1 — Local T5 pipeline** | NLTK preprocess → KeyBERT keyphrase extraction → `valhalla/t5-base-qg-hl` question generation → WordNet synset distractors → KeyBERT topic tag → Jaccard dedup. ~1 GB cold-start download. | (1) WordNet distractors were lexically related but academically meaningless (e.g. sibling hyponyms of generic English nouns). (2) KeyBERT is deterministic — re-generating from the same text produced identical questions every run. (3) `correct_option_id` mapping bug: post-shuffle string-equality lookup failed because KeyBERT phrase normalisation diverged from the assembled option text. (4) T5 extracted slide-title and agenda phrases, producing meta-level questions. (5) T5-base (220M params) had a hard quality ceiling. |
| **v2 — Hybrid** | Kept T5 + KeyBERT for question generation. Replaced WordNet/KeyBERT distractors with an OpenRouter call asking for 3 plausible distractors per question. Added Layer-1 line filters and Layer-2 token scrubbers. | Distractor quality improved markedly. (1) `correct_option_id` bug persisted — root cause was upstream of the distractor stage. (2) Question variety was still zero (KeyBERT/T5 still deterministic). (3) Question stems still capped by T5-base. (4) Cold start still 10–30 s. |
| **v3 — Full OpenRouter (current)** | Single OpenRouter call to `meta-llama/llama-3.1-8b-instruct` returns the entire quiz (questions, options, correct index, explanation, topic tag) as a JSON array. Local code does only Stage 1 (preprocess) and Stages 3–4 (parse, validate, dedup). | Removed `torch`, `transformers`, `keybert`, `sentence-transformers` from `requirements.txt`. `correct_option_id` is correct **by construction** — UUIDs are assigned at parse time. LLM temperature gives natural per-run variety. Trade-off: depends on OpenRouter free tier; mitigated by retry at higher temperature when quality filter rejects too many. |

### 8.2 Why local Whisper `tiny` over a paid API

- No API key required; runs entirely on CPU.
- Model is ~75 MB; auto-downloads on first use, cached thereafter.
- Tiny is ~32× real-time speed and works well for clear lecture audio (`documents/audio-extraction/AUDIO_EXTRACTION.md:147`).
- Trade-off: degraded accuracy on noisy audio. Accepted because student lectures are typically recorded in low-noise environments and project budget excludes paid transcription APIs.

### 8.3 Why Gemini for embeddings + chat (Chattie)

- Free quota on Google AI Studio sufficient for FYP-scale evaluation.
- 768-dim `text-embedding-004` matches pgvector storage and ivfflat index choice.
- `gemini-2.0-flash` provides low latency and Markdown-formatted output suitable for `react-markdown`.
- Single-vendor (Google AI Studio) for both embedding and generation simplifies key management — only `GEMINI_API_KEY` is needed.

### 8.4 Why OpenRouter Llama 3.1 8B for quiz + summarization

- OpenRouter free tier supports the model at sufficient throughput for FYP evaluation.
- Same model used by both features → only one `OPENROUTER_API_KEY` to manage.
- Instruction-tuned 8B model is large enough to follow strict JSON schema instructions reliably (vs the 220M T5 baseline used previously).

### 8.5 Why Gemini Flash 1.5 (not Llama) for Study Room questions

- Gemini Flash 1.5 returns more reliable JSON for the multi-question generation prompt under stricter token budgets (Study Room asks for ~20 questions in one call vs 5–20 for the workspace quiz). **TBD — needs Akila input** to confirm whether this was an empirical or pragmatic choice.

### 8.6 Why pgvector over Pinecone / Qdrant / Weaviate

- Already inside Supabase — no extra vendor, no extra credentials, no extra latency hop.
- 768-dim ivfflat with cosine similarity is sufficient for the per-workspace scale of this project (low-thousands of chunks per user).
- Migration cost is zero — `CREATE EXTENSION vector` and one ivfflat index.

### 8.7 Other build-vs-buy decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth provider | Supabase Auth (replaced earlier Clerk integration — see `frontend/src/app/api/webhooks/clerk/` referenced in `Project_Structure.md:88`) | Single-vendor with the database; RLS built-in |
| File storage | UploadThing | Direct browser-to-storage uploads with no Express bandwidth cost |
| Email | Resend | Modern API, generous free tier |
| Realtime | Supabase Realtime (broadcast channels) | Already part of Supabase plan; avoids running a separate WebSocket server |
| Summarization model | OpenRouter Llama 3.1 8B (replaced local distilbart + sumy fallback — see `summarization-openrouter-migration.md`) | Eliminated a 500 MB model download and `child_process.spawn` overhead; quality improved |
| Flashcard generation | NLTK extractive (replaced FLAN-T5 — see `flashcards-implementation.md` Changelog) | Reduced 10–30 s cold start to 1–3 s; removed need for a local T5 model |

---

## 9. Testing Strategy

### Unit + Integration (Backend)

- Tooling: Jest + `ts-jest` + Supertest (`backend/jest.config.ts`).
- Mock strategy (`documents/test-suite.md`): all external I/O is mocked — Supabase, axios → ML, `child_process.spawn`, UploadThing, `pdf-parse`. No live network calls in any test.
- Coverage areas (per `README.md:459`):
  - Auth middleware: token extraction, cookie fallback, refresh rotation
  - Resources: upload, list, delete, PDF/audio/PPTX extraction pipelines
  - Summaries: generate, regenerate, delete
  - Flashcards: generate, CRUD, card status update
  - Quiz: generate, list, attempt lifecycle, topic breakdown
  - Study Room: AI service unit + integration; participant/badge unit tests
- Test files inventory:
  - Unit: 7 files in `backend/src/__tests__/unit/`
  - Integration: 5 files in `backend/src/__tests__/integration/`
- What is **not** unit-tested (`documents/test-suite.md:99`): the FastAPI ML service has no pytest suite — it is tested indirectly by axios-mocked Express tests; `auth.controller.ts`, `workspace.controller.ts`, UploadThing webhook.

### End-to-End (Playwright)

- Location: `frontend/tests/e2e/`. POMs in `pages/`, fixtures in `fixtures/base.ts`, specs in `specs/01-…` to `08-…`.
- Total: **51 tests across 8 spec files**, **8 marked `@slow`** (AI generation tests excluded from PR checks). Source: `documents/e2e-testing-pipeline.md:32`.

| Spec file | Test IDs | @slow |
|---|---|---|
| `01-auth.spec.ts` | TC-AUTH-01 → 07 | 0 |
| `02-workspace.spec.ts` | TC-WS-01 → 06 | 0 |
| `03-resources.spec.ts` | TC-RES-01 → 09 | 0 |
| `04-summarization.spec.ts` | TC-SUM-01 → 05 | 2 (SUM-02, SUM-03) |
| `05-quiz.spec.ts` | TC-QUIZ-01 → 07 | 2 (QUIZ-02, QUIZ-05) |
| `06-flashcards.spec.ts` | TC-FLASH-01 → 06 | 1 (FLASH-02) |
| `07-chattie.spec.ts` | TC-CHAT-01 → 06 | 1 (CHAT-02) |
| `08-study-room.spec.ts` | TC-SR-01 → 10 | 2 (SR-03, SR-04) |

- Each Test ID is documented in `frontend/tests/e2e/TEST_CASES.md` with preconditions, steps, and expected results — directly suitable for inclusion in the report appendix.

### CI/CD

- File: `.github/workflows/e2e.yml`.
- Triggers:
  - `pull_request` → `main`: runs against the Vercel preview URL (resolved via `patrickedqvist/wait-for-vercel-preview`); excludes `@slow`
  - `push` → `main`: runs against `VERCEL_PRODUCTION_URL`; excludes `@slow`
  - `workflow_dispatch`: manual; `run_slow=true` includes `@slow` AI tests for full pre-deploy gate
- Browsers: chromium + firefox in CI; webkit local opt-in.
- Concurrency: 2 workers in CI (avoid Railway free-tier overload), 50 % local. Retries: 2 in CI, 0 local. Timeout: 60 s.
- Reporters: list + html (always); github + junit (CI). JUnit feeds `dorny/test-reporter` for PR annotations + a custom PR-summary comment.
- Data isolation: dedicated Supabase test project; `global-setup` seeds a test user + workspace via Admin API (idempotent); `global-teardown` deletes test data unless `E2E_KEEP_SEED=true`.
- A **Tests CI pipeline** for backend unit/integration tests is implemented in recent commits (`feat: implement CI pipeline for Tests`, `fix: issues CI pipeline of testing`, `fix: login test issue`) — **TBD — needs Akila input** for the exact workflow file path and current state.

---

## 10. Development Process

### Methodology

Agile sprints, primarily solo development by Akila (`mrakiyaaa`), with feature work merged via PRs from `develop` into `main` (verified from `git log` — every feature shipped through a PR like `Merge pull request #37 from mrakiyaaa/develop`). Branch convention (`README.md:626`):

```
main        →  production-ready releases
develop     →  integration branch
feature/*   →  new features
fix/*       →  bug fixes
```

Commit convention follows Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).

### Tools

- **IDE:** VS Code with MCP integrations (`.mcp.json`, `.vscode/mcp.json`)
- **VCS:** GitHub (`mrakiyaaa/ezy-notez`) with PR-based merges, Husky pre-commit hooks
- **Project management:** **TBD — needs Akila input** (Notion?)
- **AI-assisted development:** Claude Code (the presence of `.claude/`, `CLAUDE.md`, and the project-specific Claude memory directory show this was used throughout development)

### Sprint outcomes (inferred from `git log` and `documents/`)

A precise sprint list isn't in the repo — the PR-based commit history is the closest analog. From the most recent 40 commits, observable themes (most recent first):

1. CI pipeline for backend tests (login test fix, CI pipeline implementation)
2. Workspace hub redesign + profile drawer
3. Study Room realtime fixes (live update subscriptions, room start fix, OTP join, route refactor, voice channel)
4. Playwright E2E tests implemented
5. Quiz polish (count fix, UI fixes)
6. Flashcard API implementation
7. Railway deployment fixes (python → python3, build errors, Vercel build errors)
8. Workspace hub layout (logo size, header, profile placement)

A **TBD — needs Akila input** entry: the report likely needs to map these to specific sprint numbers (Sprint 1, 2, 3, …) and dates — this can be reconstructed from commit dates if needed.

### AI-assisted Development Workflow

- Claude Code used as the in-IDE pair programmer (per `CLAUDE.md` instructions: "When starting a new conversation or task, thoroughly analyze the existing codebase and architecture before taking any action").
- Each feature has a corresponding `.md` design / implementation document in `documents/` (mandated by `CLAUDE.md`: "When creating a feature always maintain a .md file inside /documents folder.").

---

## 11. Challenges & Solutions

### 11.1 Quiz `correct_option_id` Mapping Bug

- **Problem (v1 + v2):** After T5 generated the correct answer (a KeyBERT phrase), it was placed in the options list alongside three distractors and shuffled. A post-shuffle ID lookup using string equality broke because the KeyBERT phrase and the assembled option text often diverged due to normalisation (`documents/quiz-ml-backend.md:245`).
- **Solution (v3):** Replaced the entire local pipeline with a single OpenRouter call. UUIDs are assigned to options **after** the model returns the array — so `correct_option_id` is the UUID of `options[correct_index]` by construction. No string match, no shuffle, no bug.

### 11.2 Quiz Question-Count Truncation

- **Problem:** Users requesting (e.g.) 10 questions sometimes received fewer because the LLM occasionally returned fewer items than requested or the quality filter rejected too many.
- **Solution:** Stage 2 over-generation — the prompt asks for `max(question_count + 2, ⌊count × 1.5⌋)` items so the filter has slack. If Stage 3 still produces fewer valid questions than `question_count`, a second OpenRouter call is fired at temperature 0.9 and the results are pooled before Stage 4 runs (`documents/quiz-ml-backend.md:159`).
- **Bug fix commit:** `fix: quiz count issue`. **TBD — needs Akila input** — confirm this commit fully closed the bug or whether residual edge cases remain.

### 11.3 venv Portability

- The Windows-specific `npm run dev:ml` command in `package.json:10` invokes `.\\venv\\Scripts\\python.exe` directly. This does not work cross-platform; a developer on macOS/Linux must run uvicorn manually. **TBD — needs Akila input** — was this an explicit decision (Windows-only dev) or a known limitation accepted for FYP scope?

### 11.4 Aura Colour Scoping Decision (`documents/aura-theme-removal.md`)

- **Problem:** The original 8-colour aura theme was threaded through every workspace feature component as `auraHex` / `auraRgb` / `auraContrast` props. This produced inconsistent visual chrome and made the design system difficult to maintain.
- **Solution (2026-04-12):** Removed all aura-prop threading. Aura is now used **only** for the `AuraIndicator` dot in the workspace header and on workspace cards. All other chrome uses `--color-blue-accent` and `--color-fade-border` design tokens. Quiz / flashcard / summarization / Chattie / resources / WorkspaceHome views were all refactored.

### 11.5 Migration: distilbart Summarization → OpenRouter (`documents/summarization-openrouter-migration.md`)

- Removed `backend/scripts/summarize_text.py` and all `child_process.spawn` logic from `summary.service.ts`. Now calls OpenRouter directly via axios. Frontend response shape unchanged so no UI changes required.

### 11.6 Migration: FLAN-T5 Flashcards → Extractive NLP

- 2026-04-02 changelog entry: replaced FLAN-T5 with NLTK extractive pipeline. Generation went from ~10 s with model load to 1–3 s. Removed `preload_model.py` and the duplicate flashcard script.

### 11.7 Microservice Consolidation: Quiz ML + Chattie ML → Unified ML

- Originally two separate FastAPI services on `:8001` and `:8002`. Merged into `services/ml/` on `:8000` with `/quiz/*` and `/chatie/*` mounted as routers. Backend simplified to single `PYTHON_ML_URL` env var. Halved Railway cost. Documented in `documents/railway-deployment/RAILWAY_DEPLOYMENT.md`.

### 11.8 Auth Migration: Clerk → Supabase Auth

- `frontend/src/app/api/webhooks/clerk/` and the legacy `/sign-in/[[...sign-in]]` / `/sign-up/[[...sign-up]]` route groups in `Project_Structure.md` show Clerk was the original auth provider. Production uses Supabase Auth (`@supabase/ssr` middleware, custom `/auth/login` and `/auth/signup` pages). **TBD — needs Akila input** — confirm Clerk webhook code was deleted or is still present as dead code.

### 11.9 Vercel / Railway Deployment Issues (from commit log)

- Multiple `fix: Vercel build error` commits — typical Next.js 16 release-cycle issues.
- `fix: chnage python to pyton3` and `fix: python error on railway` — Railway base image used `python3` not `python`; `child_process.spawn('python', …)` had to be updated.

---

## 12. Deployment

### Environments

| Env | Frontend | Backend | ML | Database |
|---|---|---|---|---|
| Local dev | `npm run dev:frontend` (`:3000`) | `npm run dev:backend` (`:3001`) | `npm run dev:ml` (`:8000`) | Cloud Supabase or local Supabase |
| Production | Vercel | Railway (Docker) | Railway (Docker) | Supabase managed |

### Hosting per Service

| Service | Host | Image / Runtime |
|---|---|---|
| Next.js frontend | Vercel | Standalone Next.js build |
| Express API | Railway | `node:20-alpine` multi-stage Dockerfile (`backend/Dockerfile`) |
| Unified ML | Railway | `python:3.10-slim` Dockerfile (`services/ml/Dockerfile`) — pre-bakes Whisper `tiny` and NLTK data at build time |

### Domain / DNS / Email

- **Domain:** `https://ezynotez.com` (set as `HTTP-Referer` header in OpenRouter calls — `documents/quiz-ml-backend.md:130`).
- **DNS:** **TBD — needs Akila input** (registrar, Cloudflare? Vercel-managed?).
- **Email sender:** Resend; sender domain **TBD — needs Akila input**.

### Environment Variables (names only — actual values are gitignored)

#### Express backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon key (browser-safe but kept server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (bypasses RLS) |
| `SUPABASE_DB_URL` | Direct Postgres connection string |
| `PYTHON_ML_URL` | Base URL of the FastAPI ML service (e.g. `http://localhost:8000`) |
| `UPLOADTHING_TOKEN` | UploadThing API token |
| `OPENROUTER_API_KEY` | Used by `summary.service.ts` and `studyRoomAI.service.ts` |
| `RESEND_API_KEY` | Email sender (Study Room invites) |
| `FRONTEND_URL` | CORS origin / email link base |
| `PORT` | Defaults to 3001; Railway overrides |

#### FastAPI ML service (`services/ml/.env`)

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | Quiz pipeline |
| `GEMINI_API_KEY` | Chattie embeddings + chat |
| `SUPABASE_URL` | Chattie DB writes |
| `SUPABASE_SERVICE_ROLE_KEY` | Chattie service-role access |
| `PORT` | Defaults to 8000; Railway overrides |

#### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase client |
| `NEXT_PUBLIC_API_URL` | Express backend URL |
| `UPLOADTHING_TOKEN` | UploadThing UI |

#### E2E test env (`frontend/tests/e2e/.env.test`, derived from `.env.test.example`)

| Variable | Purpose |
|---|---|
| `PLAYWRIGHT_BASE_URL` | Frontend URL under test |
| `EXPRESS_URL`, `FASTAPI_URL` | Health-check URLs (not read by Playwright itself) |
| `SUPABASE_URL` / `SUPABASE_TEST_URL` | Test Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_TEST_SERVICE_ROLE` | Service role for global setup |
| `SUPABASE_TEST_ANON_KEY` | Anon key for the test project |
| `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` | Seeded test user |
| `E2E_KEEP_SEED` | Skip teardown for debugging |

GitHub Actions secrets (CI):
`SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE`, `EXPRESS_URL`, `FASTAPI_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `VERCEL_PRODUCTION_URL`.

---

## 13. Folder Structure (verbatim, top 2 levels)

```
ezy-notez/
├── .claude/                       Claude Code project settings
├── .github/
│   └── workflows/
│       └── e2e.yml                Playwright E2E pipeline
├── .husky/                        Git hooks
├── .vscode/                       Editor / MCP config
├── backend/
│   ├── Dockerfile                 Multi-stage (dev / builder / prod)
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── .env.test                  Safe dummy env for Jest
│   ├── scripts/                   Spawned Python helpers
│   │   ├── generate_flashcards.py
│   │   ├── pptx_extract.py
│   │   ├── preload_model.py
│   │   ├── whisper_transcribe.py
│   │   └── youtube_transcript.py
│   └── src/
│       ├── index.ts               Entry
│       ├── server.ts              Express app + middleware
│       ├── uploadthing.ts         UploadThing handler
│       ├── config/                env.ts, supabase.ts
│       ├── controllers/           10 controllers (auth, resource, workspace, summary, flashcard, quiz, chatie, studyRoom, voiceRoom, analytics)
│       ├── routes/                9 route modules
│       ├── services/              13 service modules incl. studyRoomAI / studyRoomRealtime / studyRoomResources
│       ├── middleware/            auth.middleware.ts
│       ├── utils/                 nameGenerator, slugGenerator, openRouterClient
│       ├── types/                 express.d.ts
│       └── __tests__/             unit/ + integration/ + helpers/
├── docker-compose.dev.yml         Hot-reload dev compose
├── docker-compose.prod.yml        Production compose
├── docs/
│   └── PROJECT_CONTEXT_FOR_REPORT.md   (this file)
├── documents/                     Per-feature implementation docs
│   ├── audio-extraction/
│   ├── railway-deployment/
│   ├── summarization/
│   ├── youtube-extraction/
│   ├── Project_Structure.md
│   ├── Refactor_Phase1_Analysis.md
│   ├── aura-indicator-refactor.md
│   ├── aura-theme-removal.md
│   ├── chatie-rag-implementation.md
│   ├── e2e-testing-pipeline.md
│   ├── flashcards-implementation.md
│   ├── markdown-summarization.md
│   ├── playwright-e2e-testing.md
│   ├── profile-drawer.md
│   ├── quiz-aura-theme.md
│   ├── quiz-implementation.md
│   ├── quiz-ml-backend.md
│   ├── quiz-ui-redesign.md
│   ├── settings-page.md
│   ├── study-room-backend.md
│   ├── study-room-realtime-fix.md
│   ├── study-room-route-refactor.md
│   ├── study-room-schema.md
│   ├── summarization-openrouter-migration.md
│   ├── test-suite.md
│   └── voice-chat-webrtc.md
├── frontend/
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   ├── playwright.config.ts
│   ├── components.json            shadcn config
│   ├── package.json
│   ├── public/                    /images/landing, /images/logo, /images/icons
│   ├── src/
│   │   ├── app/                   Next.js App Router (auth, dashboard, study-rooms)
│   │   ├── components/            ui, dashboard, profile, study-room, workspace
│   │   ├── lib/                   api, hooks, store, services, utils, mock
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── api/
│   │   ├── types/
│   │   ├── documents/
│   │   └── global.d.ts
│   └── tests/
│       └── e2e/                   pages/, fixtures/, setup/, specs/, results/, README.md, TEST_CASES.md
├── package.json                   Root scripts (concurrently dev/test:e2e)
├── package-lock.json
├── README.md                      Top-level project doc
├── CLAUDE.md                      Agent instructions
├── do.js / replace.js             Utility scripts (TBD purpose)
├── requirements.txt               Root Python deps for scripts
├── services/
│   └── ml/                        Unified FastAPI ML microservice
│       ├── Dockerfile             python:3.10-slim with pre-baked models
│       ├── requirements.txt
│       ├── main.py                /health + lifespan + mounts /quiz, /chatie
│       ├── quiz/                  __init__, models, pipeline, router
│       ├── chatie/                __init__, db, embeddings, models, router
│       └── routers/               __init__, flashcards
├── supabase/                      SQL migration files (7 files)
└── venv/                          Local Python venv (gitignored)
```

---

## 14. Statistics

> All counts taken on `2026-05-06` from the `develop` branch, head commit `2c3e5ff`.

| Metric | Value | Source |
|---|---|---|
| Total commits | **133** | `git rev-list --count HEAD` |
| First commit date | 2026-02-14 | `git log --reverse --format="%ad" --date=short \| head -1` |
| Latest commit date | 2026-05-06 | `git log -1 --format="%ad" --date=short` |
| Project duration | ~12 weeks (Feb 14 → May 6, 2026) | derived |
| TypeScript / TSX source files | included in 187 source-file count | `find` |
| Python source files | included in 187 | `find` |
| SQL migration files | 7 | `ls supabase/*.sql` |
| Total source files (`*.ts`, `*.tsx`, `*.py`, `*.sql`) under src dirs | **187** | `find frontend/src backend/src services -type f …` |
| Lines of TypeScript / TSX (frontend + backend) | **~30 176** | `find … -exec cat \| wc -l` |
| Lines of Python | **~2 385** | `find services backend/scripts -name "*.py"` |
| Lines of SQL | **~512** | `find supabase -name "*.sql"` |
| Express route declarations | **~73** | `grep -E "router\.(get\|post\|put\|patch\|delete)" backend/src/routes/*.ts \| wc -l` |
| FastAPI endpoint declarations | **~10** | `grep -rE "@(app\|router)\.(get\|post\|put\|patch\|delete)" services/ml/` |
| Database tables created in migrations | **14** + `profiles` (via trigger) | per §7 above |
| Backend Jest test files | 7 unit + 5 integration = **12** | `ls backend/src/__tests__/...` |
| E2E test cases | **51** (8 specs, 8 `@slow`) | `documents/e2e-testing-pipeline.md:32` |
| Implementation docs in `documents/` | **24** files + 4 sub-folders | `ls documents/` |

> The "files by type" and "lines of code" counts above are approximate and exclude `node_modules`, `.next`, `venv`, `dist`. A precise `cloc` run is **TBD — needs Akila input** if more accurate figures are required for the report.

---

## 15. Open Items / Known Gaps

### Features incomplete or partial (verified in code or docs)

- **Resend email integration for Study Room invites** — `email.service.ts:sendStudyRoomInvite` is described as a `console.log` placeholder pending the addition of `RESEND_API_KEY` (`documents/study-room-backend.md:106`). **TBD — needs Akila input** — has this been completed?
- **Auth controller** is not unit-tested (per `documents/test-suite.md:104`) — explicitly listed as future work.
- **Workspace controller** is not unit-tested (`documents/test-suite.md:105`).
- **UploadThing webhook route** is not unit-tested (`documents/test-suite.md:106`).
- **DOCX extraction path** — README claims DOCX support but no dedicated script exists in `backend/scripts/`. **TBD — needs Akila input**.
- **Clerk webhook code** still present at `frontend/src/app/api/webhooks/clerk/` despite Supabase Auth migration. **TBD — needs Akila input** — keep or delete.
- **Voice chat in Study Room** — only available in lobby, not during quiz (per `voice-chat-webrtc.md`). Documented decision; not necessarily a gap.

### Bugs not yet fixed / Recent fixes still under verification

- `fix: login test issue` (latest commit) — confirm whether the login E2E test now passes consistently.
- `fix: studyroom issue`, `fix: room not starting issue`, `fix: otp joining and invitation card display issue` — recent fixes; **TBD — needs Akila input** to confirm regressions are absent.

### Documented future enhancements

From `documents/quiz-implementation.md:208`:

1. Custom bear animation JSON files for richer emotion expressions
2. Difficulty levels for questions
3. Timed quiz mode
4. Spaced repetition for failed questions
5. Quiz sharing between workspace members
6. Analytics dashboard for learning progress

The `analytics.controller.ts` and `analytics.service.ts` files exist in `backend/src/` — implying point 6 is partially scaffolded. **TBD — needs Akila input** for current status.

---

## Questions for Akila

The following items could not be answered from the codebase alone. Each has a one-line question — please add the answer next to it in the report draft.

1. **Supervisor name.** Who is the academic supervisor for PUSL3190?
2. **University partner / campus.** Which Plymouth partner institution and campus?
3. **Submission date / academic year.** What is the report deadline and the academic year (2025-26?)?
4. **Workspace and resources migrations.** `supabase/` is missing `create_workspaces_table.sql` and `create_resources_table.sql` despite the README referring to them — were these applied directly via the Supabase dashboard? If so, please dump the schema for inclusion.
5. **DOCX extraction.** README claims DOCX support — which script or library handles it? (No dedicated script exists in `backend/scripts/`.)
6. **`socket.io-client` usage.** Is Socket.IO used in production, or is Supabase Realtime the only realtime transport?
7. **Resend email integration.** Has `sendStudyRoomInvite` been wired to the Resend SDK, or is it still a `console.log` placeholder?
8. **Clerk webhook code.** Has the legacy `frontend/src/app/api/webhooks/clerk/` directory been deleted, or is it dead code that still ships?
9. **Sprint mapping.** How do you map the commit history to your formal sprint plan (Sprint 1 / 2 / 3 / …)? Sprint goals and end dates?
10. **Project management tool.** Notion? GitHub Projects? Jira? Trello?
11. **Domain and DNS provider.** Where is `ezynotez.com` registered and which DNS provider?
12. **Email sender domain.** Which domain do Resend transactional emails come from?
13. **Backend tests CI workflow.** The recent commit `feat: implement CI pipeline for Tests` adds a backend test workflow — what's its file path and current pass rate?
14. **Quiz count fix verification.** Has `fix: quiz count issue` been validated against the previously-failing edge cases? Are there reproducible cases left?
15. **Why Gemini Flash 1.5 (not Llama) for Study Room.** Was this an empirical (prompt-following) or pragmatic (cost / quota) choice?
16. **Windows-only `dev:ml` script.** Is the `\\venv\\Scripts\\python.exe` path in `package.json` an explicit decision (Windows-first dev environment), or should it be cross-platform-friendly?
17. **Whisper model size justification.** Were `base` / `small` Whisper models tested and rejected, or was `tiny` chosen on first principles?
18. **Total Whisper / Gemini / OpenRouter cost during development.** Useful for the report's evaluation section.
19. **Number of beta testers / user testers.** Did real students test EZY Notez? How many, what feedback?
20. **Aura colour palette.** What are the 8 aura hex values and were they user-selectable or auto-assigned?
21. **Voice chat WebRTC architecture.** Is signalling on Supabase Realtime channels and audio peer-to-peer, or is it relayed through a SFU? (The doc title `voice-chat-webrtc.md` suggests WebRTC P2P — please confirm.)
22. **Analytics feature status.** `analytics.controller.ts` exists — what does it currently do, and is it wired to the frontend?
23. **Deployment cost per month.** Vercel + Railway × 2 + Supabase + UploadThing + Resend — useful for the report's deployment chapter.
24. **`do.js` and `replace.js`.** Top-level utility scripts — what do they do and are they part of the production runtime?
25. **First commit context.** The first commit is dated 2026-02-14. Was there earlier prototyping in a different repo, or is that the genuine project start?
