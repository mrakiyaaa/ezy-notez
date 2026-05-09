# EZY Notez — Project Context for Final Year Report

> Self-contained context dossier compiled from the codebase for the PUSL3190
> final-year project report (10,000 words). Every fact in this document is
> traceable to a file path or document quoted inline. Items that could not be
> verified from the codebase are marked **TBD — needs Akila input**.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | EZY Notez |
| **Tagline** | *Transform your documents, audio & videos into quizzes, flashcards and summaries — powered by AI.* |
| **One-line Description** | AI-powered academic learning platform that converts uploaded study materials (PDF, PPTX, DOCX, audio, YouTube) into quizzes, flashcards, summaries, and a RAG chatbot — all within workspace-scoped study environments. |
| **Author / Developer** | Akila Lakshitha (GitHub: `mrakiyaaa`) |
| **Module Code** | PUSL3190 |
| **University** | University of Plymouth |
| **Supervisor** | **TBD — needs Akila input** |
| **Academic Year** | 2025–2026 |
| **Repository** | https://github.com/mrakiyaaa/ezy-notez |
| **License** | ISC |

### Repository Structure Overview

| Top-level Directory / File | Purpose |
|---|---|
| `frontend/` | Next.js 16 application (deployed on Vercel) |
| `backend/` | Express.js 5 REST API (deployed on Railway) |
| `services/ml/` | Unified FastAPI Python ML microservice — quiz generation + Chattie RAG (deployed on Railway) |
| `supabase/` | SQL migration files for the Supabase PostgreSQL database |
| `documents/` | Feature implementation documentation (one `.md` per feature) |
| `docs/` | High-level project docs |
| `docker-compose.dev.yml` | Docker Compose for local development (hot reload) |
| `docker-compose.prod.yml` | Docker Compose for production builds |
| `package.json` | Root monorepo orchestration (`concurrently` dev runner, Husky hooks) |
| `requirements.txt` | Root Python dependencies for backend scripts (Whisper, NLTK, transformers) |
| `replace.js` / `do.js` | Utility scripts |
| `venv/` | Python virtualenv (gitignored by convention) |

---

## 2. Problem Statement & Motivation

### The Problem

University students generate large volumes of study material — lecture slides, notes, recorded lectures, and supplementary readings — yet spend disproportionate time manually converting that material into revision aids (flashcards, practice questions, summaries). Existing tools require manual effort or are not academic-context-aware.

### Target Users

- Undergraduate and postgraduate university students
- Students who have diverse resource formats (PDFs, PowerPoints, audio recordings, YouTube lecture links)
- Students preparing for assessments who need rapid generation of self-testing material

### Gap in Existing Tools

| Existing Tool | Gap |
|---|---|
| Anki / Quizlet | Manual card creation; no AI generation from arbitrary documents |
| ChatGPT | No workspace organisation; no persistent quizzes/flashcards; no file-context chunking |
| Notion AI | Summarisation only; no quiz/flashcard generation; no audio/video support |
| Kahoot / Mentimeter | Quiz creation is manual; no multi-format import |

EZY Notez addresses all these gaps in a single platform with per-workspace data isolation, multi-format ingestion, and collaborative Study Rooms.

---

## 3. Objectives & Deliverables

### Primary Objectives

1. Build a full-stack AI-powered study platform for university students.
2. Support multi-format resource ingestion: PDF, PPTX, DOCX, audio (MP3/WAV/M4A/WebM/OGG), and YouTube URLs.
3. Automatically generate quizzes, flashcards, and summaries from uploaded material using AI/NLP.
4. Provide a workspace-scoped RAG chatbot (Chattie) grounded in uploaded resources.
5. Implement real-time collaborative Study Rooms with quiz competitions and voice chat.
6. Deploy a production-ready system with CI/CD, E2E tests, and Row Level Security.

### Functional Features Delivered

| Feature | Status |
|---|---|
| User authentication (register, login, logout) | Complete |
| Workspace creation with aura color theming + slug routing | Complete |
| Multi-format resource upload (PDF, PPTX, DOCX, audio, YouTube) | Complete |
| AI Summarization (bullet / short / detailed) via OpenRouter LLM | Complete |
| Flashcard Generation (extractive NLP, NLTK) | Complete |
| Quiz Generation (MCQ / Scenario / Mixed) via OpenRouter LLM | Complete |
| Chattie RAG Chatbot (Gemini embeddings + pgvector) | Complete |
| Study Rooms (real-time quiz, OTP/email invite, voice channel) | Complete |
| Per-workspace settings, profile management, subscription page | Complete (UI) |
| Analytics route | Complete |
| E2E test suite (51 tests, Playwright) | Complete |
| Docker Compose dev + prod | Complete |

### Non-Functional Requirements Addressed

| NFR | Mechanism |
|---|---|
| **Security** | Supabase Auth (JWT), HttpOnly cookie fallback, Row Level Security on all tables, server-side quiz scoring |
| **Performance** | Async/fire-and-forget pipelines (quiz, summary, flashcard generation); polling-based status; pgvector ivfflat index; OpenRouter API (no local GPU) |
| **Scalability** | Stateless Express API; three independently deployable services; Railway auto-scaling |
| **UX** | Glassmorphism design system, Framer Motion animations, Teddy Bear companion, polled loading states, keyboard navigation, responsive layout |
| **Maintainability** | TypeScript throughout; Jest unit + integration tests; Playwright E2E; Husky pre-commit hooks; documented architecture per feature |

---

## 4. Tech Stack (Exhaustive)

### 4.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | App framework — SSR, file-based routing, API routes |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | 3.8.4 | Base component library (radix-ui primitives) |
| radix-ui | 1.4.3 | Accessible UI primitives |
| Framer Motion | 12.38.0 | Page and component animations |
| Zustand | 4.4.7 | Client-side global state management |
| Axios | 1.6.2 | HTTP client for API calls |
| `@supabase/supabase-js` | 2.97.0 | Supabase JS client (auth, realtime) |
| `@supabase/ssr` | 0.8.0 | Supabase SSR helpers for Next.js |
| `@uploadthing/react` | 7.3.3 | File upload component |
| `uploadthing` | 7.7.4 | UploadThing SDK |
| `lottie-react` + `@lottiefiles/dotlottie-react` | 2.4.1 / 0.19.0 | Lottie animation playback (Teddy Bear companion) |
| `lucide-react` | 0.564.0 | Icon library |
| `react-markdown` | 10.1.0 | Markdown rendering for summaries / chat |
| `socket.io-client` | 4.6.0 | WebSocket client (Study Rooms realtime) |
| `three` / `ogl` | 0.167.1 / 1.0.11 | 3D/WebGL canvas effects |
| `clsx` + `tailwind-merge` + `class-variance-authority` | — | Conditional class utilities |
| `tw-animate-css` | 1.4.0 | CSS animation utilities |
| Playwright | 1.59.1 | E2E testing |
| ESLint | 9.x | Linting |

### 4.2 Backend (Express.js Service)

| Technology | Version | Purpose |
|---|---|---|
| Express.js | 5.2.1 | REST API framework |
| TypeScript | 5.7.3 | Type safety |
| ts-node-dev | 2.0.0 | Dev server with auto-restart |
| `@supabase/supabase-js` | 2.95.3 | Supabase client (DB queries, auth verification) |
| `@supabase/ssr` | 0.8.0 | SSR token handling |
| `pdf-parse` | 2.4.5 | PDF text extraction |
| `uploadthing` | 7.7.4 | File storage SDK |
| `@uploadthing/react` | 7.3.3 | UploadThing react SDK |
| `resend` | 6.12.0 | Transactional email (study room invites) |
| `axios` | 1.7.9 | HTTP client (ML service calls) |
| `cookie-parser` | 1.4.7 | Cookie parsing (auth token fallback) |
| `cors` | 2.8.5 | CORS middleware |
| `pg` | 8.13.3 | PostgreSQL client (direct DB access) |
| `dotenv` | 16.4.7 | Environment variable loading |
| Jest | 29.7.0 | Unit and integration test runner |
| Supertest | 7.0.0 | HTTP assertion library for tests |
| ts-jest | 29.3.1 | TypeScript support for Jest |

### 4.3 ML Service (FastAPI — Python)

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.0 | ML microservice web framework |
| uvicorn (standard) | 0.30.0 | ASGI server |
| Pydantic | 2.9.0 | Request/response schema validation |
| python-dotenv | 1.0.1 | Environment variable loading |
| httpx | 0.27.2 | Async HTTP client (OpenRouter calls) |
| NLTK | 3.9.1 | Text preprocessing (tokenisation, quiz pipeline) |
| supabase (Python) | 2.11.0 | Supabase client for Chatie DB operations |
| google-genai | ≥1.0.0 | Gemini API SDK (embeddings + chat generation) |
| tiktoken | 0.8.0 | Token counting for context windows |

### 4.4 Backend Python Scripts (child_process.spawn)

| Technology | Version | Purpose |
|---|---|---|
| openai-whisper | — | Audio transcription (Whisper `tiny` model, ~75 MB, local) |
| python-pptx | — | PPTX text extraction |
| youtube-transcript-api | ≥1.2.4 | YouTube caption/subtitle fetching |
| transformers | — | (Legacy — present in root `requirements.txt` for `distilbart`, now unused by current pipeline) |
| torch | — | (Legacy — present for Whisper runtime on CPU) |
| sumy | — | LSA extractive summarisation fallback (now superseded by OpenRouter) |
| nltk | — | Flashcard NLP (punkt, POS tagger, stopwords) |
| requests | — | HTTP requests in Python scripts |

### 4.5 Database

| Technology | Details |
|---|---|
| **Engine** | PostgreSQL (managed by Supabase) |
| **Extensions** | `pgvector` (vector similarity search, ivfflat index, cosine similarity) |
| **Client (Node)** | `@supabase/supabase-js` v2 (Express + frontend) |
| **Client (Python)** | `supabase` v2.11.0 (FastAPI ML service) |
| **Direct access** | `pg` v8.13.3 for raw SQL queries in Express |
| **RLS** | Row Level Security enabled on all user-data tables |

### 4.6 AI / ML

| Model / API | Provider | Purpose |
|---|---|---|
| `meta-llama/llama-3.1-8b-instruct` | OpenRouter (free tier) | Quiz generation, summarization (replacing local T5 + distilBART) |
| `gemini-2.0-flash` | Google AI (Gemini API) | RAG chat response generation in Chattie |
| `text-embedding-004` | Google AI (Gemini API) | 768-dim resource chunk embeddings for Chattie RAG |
| Whisper `tiny` | OpenAI (local, open-source) | Audio transcription — runs locally via Python child process, no API key |
| NLTK (`punkt_tab`, `averaged_perceptron_tagger_eng`, `stopwords`) | Local | Flashcard generation: sentence tokenization, POS tagging |
| `distilbart-cnn-12-6` | HuggingFace (local, legacy) | Was used for summarization; superseded by OpenRouter migration |
| `valhalla/t5-base-qg-hl` | HuggingFace (local, legacy) | Was used for quiz question generation; superseded by OpenRouter migration |
| `all-MiniLM-L6-v2` via KeyBERT | HuggingFace (local, legacy) | Was used for answer extraction + topic tagging; superseded |
| WordNet (NLTK) | Local (legacy) | Was used for distractor generation; superseded |

### 4.7 Authentication

| Technology | Details |
|---|---|
| Supabase Auth | JWT-based authentication |
| Token delivery | Bearer `Authorization` header (primary) + HttpOnly cookie (fallback) |
| Session refresh | Auth middleware rotates tokens on every protected request |
| Profile auto-creation | PostgreSQL trigger (`handle_new_user`) on `auth.users` insert |

### 4.8 File Storage

| Technology | Details |
|---|---|
| UploadThing | Hosted file storage for user-uploaded documents and audio |
| Environment variable | `UPLOADTHING_TOKEN` |
| SDK | `uploadthing` v7.7.4 + `@uploadthing/react` v7.3.3 |

### 4.9 Email

| Technology | Details |
|---|---|
| Resend | Transactional email for Study Room email invitations |
| SDK | `resend` v6.12.0 |

### 4.10 Real-time

| Technology | Details |
|---|---|
| Supabase Realtime | PostgreSQL change events for study room state, invite delivery |
| Socket.IO | `socket.io-client` v4.6.0 — real-time study room session (question broadcast, answer collection) |
| WebRTC (STUN) | Peer-to-peer voice channel in Study Room lobby; signaling via Supabase Realtime broadcast on `voice-room-{roomId}` channel; ICE: `stun:stun.l.google.com:19302` |

### 4.11 Testing

| Technology | Details |
|---|---|
| Jest | Backend unit and integration tests |
| Supertest | HTTP-level Express API testing |
| ts-jest | TypeScript Jest transform |
| Playwright | `@playwright/test` v1.59.1 — E2E browser automation |
| Page Object Model | `frontend/tests/e2e/pages/` |
| CI test runner | GitHub Actions (`.github/workflows/e2e.yml`) |

### 4.12 Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Next.js native deployment, preview URLs per PR |
| Express API | Railway | Docker (multi-stage, `node:20-alpine`) |
| Unified ML Service | Railway | Docker (`python:3.10-slim`), CPU-only PyTorch |
| Database | Supabase | Managed PostgreSQL with pgvector |

### 4.13 DevOps / CI

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Dev (hot reload) and production containerisation |
| Husky | Pre-commit hooks (root `package.json`) |
| GitHub Actions | E2E Playwright CI pipeline on PR to `main` |
| `concurrently` | Runs all three services in one terminal (`npm run dev`) |
| Conventional Commits | `feat:`, `fix:`, `refactor:`, `docs:`, `test:` prefixes |
| Branching | `main` (production) → `develop` (integration) → `feature/*` / `fix/*` |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Browser (Next.js 16 / React 19)             │
│         Tailwind 4 · shadcn/ui · Zustand · Axios         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST  (port 3000 → 3001)
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Express.js 5 Backend  (port 3001)              │
│   Auth Middleware · Controllers · Services               │
│   child_process.spawn → Python scripts (Whisper/        │
│   youtube_transcript / generate_flashcards)              │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│  Supabase        │  │  FastAPI Unified ML  (port 8000) │
│  PostgreSQL      │  │   /quiz  → OpenRouter LLM        │
│  + pgvector      │  │   /chatie → Gemini embeddings    │
│  + Auth          │  │           + pgvector RAG         │
│  + RLS           │  │   /flashcards (router present)   │
│  + Realtime      │  └──────────────────────────────────┘
└──────────────────┘
```

### 5.2 Data Flow per Major Feature

**Resource Upload (PDF/PPTX/DOCX)**
1. Frontend uploads file to UploadThing → receives file URL.
2. Frontend calls `POST /api/resources` with `fileUrl`, `workspaceId`, `type`.
3. Express inserts resource row (`status = indexing`), spawns Python script:
   - PDF: `pdf-parse` Node.js library (in-process)
   - PPTX: `python-pptx` via `child_process.spawn`
   - DOCX: **TBD — needs Akila input**
4. Extracted text saved to `resources.extracted_text`; `status → ready`.
5. Fire-and-forget call to FastAPI `/chatie/embed-resource` to chunk + embed for RAG.

**Audio Transcription**
1. Frontend uploads audio to UploadThing.
2. Frontend calls `POST /api/resources/:id/extract-audio`.
3. Express spawns `backend/scripts/whisper_transcribe.py` with file URL.
4. Python downloads audio, runs Whisper `tiny` model locally, prints transcript to stdout.
5. Express captures stdout, saves to `extracted_text`, sets `status → ready`.

**YouTube Extraction**
1. Frontend calls `POST /api/resources/youtube` with URL.
2. Express spawns `backend/scripts/youtube_transcript.py`.
3. Python fetches captions via `youtube-transcript-api`, fetches title via HTTP/regex.
4. Transcript + title returned via stdout; stored in `extracted_text`.

**AI Summarization**
1. Frontend calls `POST /api/summaries/general` or `/api/summaries/custom`.
2. Express inserts `summaries` row (`status = pending`), returns immediately.
3. Background pipeline calls `callOpenRouterForSummary()` for each resource.
4. General mode: two-pass (per-resource → combine); Custom: one pass per resource.
5. OpenRouter `meta-llama/llama-3.1-8b-instruct` generates markdown output.
6. Row updated `status → ready`; frontend polls until complete.

**Flashcard Generation**
1. Frontend calls `POST /api/flashcards/generate`.
2. Express inserts `flashcard_sets` row, spawns `backend/scripts/generate_flashcards.py`.
3. Python pipeline: TF-IDF scoring → POS tagging → pattern-based question generation → deduplication.
4. Returns JSON array; Express inserts individual `flashcards` rows, sets `status → ready`.

**Quiz Generation**
1. Frontend calls `POST /api/quiz/generate`.
2. Express inserts `quizzes` row (`status = pending`), fires async `POST /quiz/generate-quiz` to FastAPI ML.
3. FastAPI pipeline (4 stages): text preprocessing → OpenRouter LLM generation → response parsing/validation → quality filtering.
4. Express updates `quizzes` row and bulk-inserts `quiz_questions`; `status → ready`.
5. Frontend polls `GET /api/quiz/:quizId/status` every 3 seconds.

**Chattie (RAG Chat)**
1. Resource embeddings: after resource is ready, Express fires `POST /chatie/embed-resource` to FastAPI.
2. FastAPI chunks text (~500 tokens, 50-token overlap), embeds via Gemini `text-embedding-004`, stores in `resource_embeddings`.
3. Chat turn: user message → FastAPI embeds query → pgvector cosine similarity search (top 5 chunks) → system prompt + context + history sent to `gemini-2.0-flash` → response returned with source references.

**Study Rooms**
1. Host creates room (OTP or email invite); guests join via 6-digit code, email token, or shareable link.
2. Lobby: Supabase Realtime delivers participant updates and invite events; WebRTC P2P voice via `voice-room-{roomId}` broadcast channel.
3. Host starts session: Express generates questions via OpenRouter (same pipeline as quiz), stores in `study_room_questions`.
4. Live session: questions broadcast via Socket.IO; answers submitted to Express; `study_room_answers` recorded.
5. Results: leaderboard, wrong-answer review, AI weak-topic insights via OpenRouter.

### 5.3 Architecture Rationale

**Why Express + FastAPI split?**
Long-running AI inference (quiz generation: up to 30 s; summarization: up to 60 s) would block Node.js's event loop if inlined in Express. FastAPI's async Python workers handle inference natively without blocking. The split also decouples the ML dependency stack (heavy Python packages) from the lightweight Node.js API, enabling independent scaling and simpler Railway deployments.

**Why two Railway services were merged into one?**
The original architecture had separate `services/quiz-ml/` (port 8001) and `services/chatie-ml/` (port 8002). These were consolidated into `services/ml/` (port 8000) to halve Railway container cost, reduce URL management to a single `PYTHON_ML_URL` env var, and avoid duplicating FastAPI/uvicorn setup.

**Why Supabase instead of a self-managed PostgreSQL?**
Supabase provides managed PostgreSQL with the `pgvector` extension pre-installed, built-in Auth (JWT + RLS), Realtime pub/sub, and a managed storage option — eliminating the need to self-host and configure five separate services.

---

## 6. Core Features

### 6.1 AI Summarization

**What it does:** Generates workspace-wide or per-resource text summaries in three formats: Bullet Points, Short Paragraph, or Detailed multi-paragraph.

**How it works (current pipeline):**
1. User selects format + resource scope (general = all resources, custom = select individual).
2. Express inserts pending `summaries` row, returns immediately (async pipeline).
3. `callOpenRouterForSummary()` in `backend/src/services/summary.service.ts` posts to OpenRouter `meta-llama/llama-3.1-8b-instruct` (temperature 0.3, 60 s timeout).
4. General mode uses two-pass: per-resource summaries → combined final summary (higher quality than single-pass).
5. Output is plain markdown rendered by `react-markdown` in `SummaryContent.tsx`.

**Models / APIs:** OpenRouter API → `meta-llama/llama-3.1-8b-instruct`

**Key files:**
- `backend/src/services/summary.service.ts` — pipeline entry point
- `backend/src/controllers/summary.controller.ts`
- `backend/src/routes/summary.routes.ts`
- `frontend/src/components/workspace/SummarizationView.tsx`
- `frontend/src/components/workspace/summarization/` — UI sub-components

**Previous implementation:** `backend/scripts/summarize_text.py` using `distilbart-cnn-12-6` (~500 MB HuggingFace model) via `child_process.spawn`. Replaced entirely with OpenRouter API calls — the Python script was removed. No frontend changes were required as the response shape was preserved.

**Known limitations:** Summarization quality degrades on very short resources; very long documents are truncated to fit the LLM context window.

---

### 6.2 Flashcard Generation

**What it does:** Generates a set of 5–20 study flashcards (question + answer) from selected workspace resources. Progress (Known / Review Later) persists to the database.

**How it works (pipeline):**
1. Combine extracted text from selected resources.
2. Sentence split (NLTK `sent_tokenize`); filter by word count (8–60 words).
3. TF-IDF importance scoring.
4. Classify sentence type: definition, cause/effect, process, comparison, example, purpose.
5. Apply type-based score bonuses + optional topic relevance boost.
6. Extract subjects via POS tagging (noun phrase extraction).
7. Pattern-based question generation matched to sentence type.
8. Answers built from key sentence + neighbouring context.
9. Deduplicate by subject, validate quality, return JSON.

**Models / APIs:** NLTK only (local, no API keys). ~1–3 seconds on CPU.

**Key files:**
- `backend/scripts/generate_flashcards.py` — extractive NLP script
- `backend/src/services/flashcard.service.ts` — spawns script, stores results
- `frontend/src/components/workspace/FlashcardsView.tsx`
- `frontend/src/components/workspace/flashcards/StudyMode.tsx` — flip animation, keyboard nav, progress tracking

**Previous implementation (April 2, 2026):** Originally used FLAN-T5 local model; replaced with extractive NLTK pipeline for speed (~1–3 s vs. 10–30 s) and no model download requirement.

---

### 6.3 Quiz Generation

**What it does:** Generates MCQ, Scenario, or Mixed-type quizzes (5–20 questions) from workspace resources. Supports incremental answer persistence, topic accuracy breakdown, and animated Teddy Bear companion.

**How it works (current pipeline — 4 stages):**

| Stage | Location | Description |
|---|---|---|
| 1 — Preprocessing | FastAPI local | NLTK sentence segmentation, line-level noise removal (slide headers, URLs, filenames), token-level scrubbing, truncation to 3,000 chars |
| 2 — Generation | OpenRouter (remote) | Single call to `meta-llama/llama-3.1-8b-instruct`; over-generates by 1.5× for quality headroom; retry at temperature 0.9 if too few valid questions |
| 3 — Parsing/Validation | FastAPI local | Strip markdown fences, validate JSON schema, three-strategy `correct_option_id` resolver (integer index → letter label → text match), assign UUIDs |
| 4 — Quality Filtering | FastAPI local | `is_valid_question` gate (8-word min, no compound questions, 3 non-identical distractors), Jaccard deduplication (threshold 0.7), top-N selection |

**Models / APIs:** OpenRouter API → `meta-llama/llama-3.1-8b-instruct`

**Key files:**
- `services/ml/quiz/pipeline.py` — full 4-stage pipeline
- `services/ml/quiz/router.py` — FastAPI `/quiz/generate-quiz` endpoint
- `services/ml/quiz/models.py` — Pydantic schemas
- `backend/src/services/quiz.service.ts` — orchestrates HTTP to ML, DB writes
- `frontend/src/components/workspace/QuizView.tsx`, `QuizAttemptView.tsx`, `QuizResultsView.tsx`
- `frontend/src/components/workspace/quiz/TeddyCompanion.tsx` — Lottie bear with 6 emotion states

**Known limitations:** Questions require minimum ~50 characters of source text after preprocessing. Very noisy slide decks may yield fewer questions than requested.

---

### 6.4 Chattie (RAG Chatbot)

**What it does:** Workspace-scoped conversational AI grounded in uploaded resources. Users ask questions; Chattie retrieves the most semantically relevant resource chunks and generates a contextualised answer with source references.

**How it works (pipeline):**

**Embedding phase (on resource ready):**
1. Express fires async `POST /chatie/embed-resource` to FastAPI.
2. Resource text chunked into ~500 token segments, 50-token overlap (using `tiktoken`).
3. Gemini `text-embedding-004` generates 768-dimensional embedding per chunk.
4. Old embeddings for that `resource_id` deleted; new rows inserted into `resource_embeddings`.

**Chat phase (per turn):**
1. User message (+ selected `resource_ids`) sent to `POST /chatie/chat`.
2. User message embedded with `text-embedding-004` (`RETRIEVAL_QUERY` task type).
3. pgvector RPC `match_resource_embeddings` performs ivfflat cosine similarity search → top 5 chunks.
4. System prompt + retrieved context + conversation history + user message sent to `gemini-2.0-flash`.
5. Response + source references saved to `chat_history`; returned to client.

**Models / APIs:** Gemini `text-embedding-004` (embedding) + `gemini-2.0-flash` (generation)

**Key files:**
- `services/ml/chatie/router.py` — FastAPI `/chatie/*` endpoints
- `services/ml/chatie/embeddings.py` — chunking + Gemini embedding helpers
- `services/ml/chatie/db.py` — Supabase client singleton
- `backend/src/controllers/chatie.controller.ts` — Express proxy
- `frontend/src/components/workspace/Chattie.tsx`
- `supabase/create_chatie_tables.sql` — `resource_embeddings` + `chat_history` + `match_resource_embeddings` RPC

**Known limitations:** Videos with no captions, private YouTube videos, or resources with very short text may produce poor retrieval results.

---

### 6.5 Study Rooms

**What it does:** Real-time collaborative quiz sessions. A host creates a room, invites participants by email or 6-digit OTP, and runs a live quiz with scoring. Lobby includes a P2P voice channel.

**Four URL-addressable stages:**
1. `/study-rooms` — landing (redirects if no `?from=` param)
2. `/study-rooms/[roomId]/lobby` — waiting room + voice channel
3. `/study-rooms/[roomId]/session` — live quiz
4. `/study-rooms/[roomId]/results` — leaderboard + insights

**How it works:**
- Room created with `invite_method: otp | email`; OTP is a 6-digit code with expiry.
- Lobby: Supabase Realtime delivers participant joins; WebRTC mesh for voice (STUN only, max 6 peers).
- Host starts room: Express generates questions via OpenRouter (same prompt as quiz), stores in `study_room_questions`, deduplicates via `used_questions` hash.
- Live session: questions pushed via Socket.IO; answers submitted; `study_room_answers` records per-user responses.
- Results: leaderboard, badges, AI-generated weak-topic analysis via OpenRouter.

**Key files:**
- `backend/src/routes/studyRoom.routes.ts`, `backend/src/controllers/studyRoom.controller.ts`
- `backend/src/services/studyRoom.service.ts`, `backend/src/services/studyRoomAI.service.ts`
- `frontend/src/app/study-rooms/` — standalone route group with its own layout
- `frontend/src/components/study-room/` — all Study Room UI components (flat)
- `frontend/src/hooks/useVoiceRoom.ts` — WebRTC mesh management
- `supabase/create_study_room_tables.sql`

**Known limitations:** WebRTC mesh is suitable for ≤6 participants; a warning is shown beyond that. Voice requires HTTPS in production. Email invites depend on Resend API availability.

---

### 6.6 Resource Upload & Processing

**Supported formats:**

| Format | Extraction Method | Script / Library |
|---|---|---|
| PDF | `pdf-parse` (Node.js, in-process) | `backend/src/services/resource.service.ts` |
| PPTX | `python-pptx` | `backend/scripts/` (spawned by Express) |
| DOCX | **TBD — needs Akila input** | **TBD** |
| Audio (MP3/WAV/M4A/WebM/OGG) | Whisper `tiny` local model | `backend/scripts/whisper_transcribe.py` |
| YouTube URL | `youtube-transcript-api` | `backend/scripts/youtube_transcript.py` |

**Processing status state machine:** `uploading → indexing → ready | failed`

**Key files:**
- `backend/src/services/resource.service.ts` — orchestrates all extraction pipelines
- `backend/src/controllers/resource.controller.ts`
- `backend/scripts/whisper_transcribe.py`
- `backend/scripts/youtube_transcript.py`

---

## 7. Database Schema

### 7.1 All Tables

| Table | Description |
|---|---|
| `profiles` | User profile data (id, email, full_name, avatar_url) — auto-created via trigger |
| `workspaces` | User workspaces (id, user_id, name, slug, aura_keyword, aura_hex) |
| `resources` | Uploaded resources (id, workspace_id, name, url, type, status, extracted_text) |
| `summaries` | AI-generated summaries |
| `flashcard_sets` | Flashcard set metadata |
| `flashcards` | Individual flashcard front/back + user progress status |
| `quizzes` | Quiz metadata (title, type, question_count, status) |
| `quiz_questions` | Individual questions with options JSONB array |
| `quiz_attempts` | User attempt tracking (answers JSONB, score, total) |
| `resource_embeddings` | Vector embeddings for Chattie RAG |
| `chat_history` | Chattie conversation turns per workspace/user |
| `study_rooms` | Study room metadata (status, invite_method, otp_code) |
| `study_room_participants` | One row per participant per room |
| `study_room_invites` | Email-based invite tokens |
| `study_room_questions` | AI-generated questions for study rooms |
| `study_room_answers` | Per-user answers per question |
| `used_questions` | Question deduplication hashes per workspace |

**Total: 17 tables**

### 7.2 Key Schema Details

**`summaries`** (from `supabase/create_summaries_table.sql`)

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | auto-generated |
| workspace_id | UUID | FK → workspaces |
| resource_id | UUID nullable | NULL = general summary; non-null = per-resource |
| user_id | UUID | creator |
| format | TEXT | `bullet` \| `short` \| `detailed` |
| content | TEXT | Markdown output |
| source_ids | UUID[] | resources used |
| status | TEXT | `pending` \| `processing` \| `ready` \| `failed` |
| error_message | TEXT | nullable |

**`quiz_questions`** (from `supabase/create_quiz_tables.sql`)

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| quiz_id | UUID | FK → quizzes (CASCADE DELETE) |
| question_text | TEXT | |
| question_type | TEXT | `mcq` \| `scenario` |
| options | JSONB | Array of `{id, label, text}` |
| correct_option_id | TEXT | UUID string of the correct option |
| explanation | TEXT | |
| topic_tag | TEXT | |
| position | INT | ordering |

**`resource_embeddings`** (from `supabase/create_chatie_tables.sql`)

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| workspace_id | UUID | |
| resource_id | UUID | FK → resources (CASCADE DELETE) |
| chunk_index | INTEGER | Position within resource |
| chunk_text | TEXT | Raw chunk content |
| embedding | `vector(768)` | Gemini `text-embedding-004` output |

**Indexes:** `ivfflat` index on `embedding` with `vector_cosine_ops` (lists=100) for fast similarity search.

**RPC function:** `match_resource_embeddings(query_embedding, filter_workspace_id, filter_resource_ids, match_count)` — returns top-N chunks by cosine similarity.

### 7.3 pgvector Usage

| Table | Column | Dimension | Model | Purpose |
|---|---|---|---|---|
| `resource_embeddings` | `embedding` | 768 | Gemini `text-embedding-004` | Chattie RAG retrieval |

---

## 8. AI/ML Architecture Decisions

### 8.1 Quiz Generation Evolution (3 iterations)

**Iteration 1 — Local T5 Pipeline (initial implementation)**

A fully local 6-stage pipeline: NLTK preprocessing → KeyBERT answer extraction → `valhalla/t5-base-qg-hl` question generation → WordNet distractor generation → KeyBERT topic tagging → quality filtering.

*Why it was abandoned:*
- WordNet distractors were lexically proximate but academically meaningless for subject-specific answers.
- KeyBERT is deterministic → identical questions on every run from the same source text (zero variety).
- `correct_option_id` mapping bug: KeyBERT phrase normalisation diverged from assembled option text after `random.shuffle`, causing the correct answer UUID to point at the wrong option.
- Slide-header contamination (KeyBERT extracted "Learning outcomes" as keyphrases).
- Cold-start: ~10–30 s model loading + ~1 GB download.

**Iteration 2 — Hybrid (T5 questions + OpenRouter distractors)**

Kept T5 for question generation; replaced WordNet distractor stage with OpenRouter LLM per-question distractor call.

*Why it was abandoned:*
- `correct_option_id` bug was not fixed (root in KeyBERT–option assembly interaction, unchanged).
- Question variety still zero (KeyBERT + T5 still deterministic).
- Quality still limited by T5-base (220M params).
- Startup time still ~10–30 s.

**Iteration 3 — Full OpenRouter Pipeline (current)**

Replaced Stages 2–5 entirely with a single OpenRouter `meta-llama/llama-3.1-8b-instruct` call that produces questions, options, correct index, explanations, and topic tags in one structured generation step. Retained only text preprocessing (Stage 1) and quality filtering (Stage 4) as local stages.

*Why this was the right decision:*
- `correct_option_id` bug fixed by construction: UUID assigned at parse time by indexing directly into the assembled options list (no post-hoc string matching).
- Question variety introduced by LLM temperature (0.7 default, 0.9 retry).
- No local ML dependencies → instant startup.
- Academic question quality substantially higher than T5-base.
- OpenRouter free tier sufficient for FYP-scale usage.
- Trade-off accepted: external API dependency (OpenRouter) over 100% offline operation.

### 8.2 Summarization Evolution

Originally used `distilbart-cnn-12-6` (~500 MB HuggingFace model) via Python `child_process.spawn`. Replaced with direct OpenRouter API calls from Express (`meta-llama/llama-3.1-8b-instruct`, temperature 0.3). The Python `summarize_text.py` script was removed entirely. A `sumy LSA` fallback was present in the script for low-memory environments — this fallback was also removed as it is no longer needed.

*Rationale:* Eliminates 500 MB model weight download; higher-quality output from the instruction-tuned LLM; two-pass strategy (per-resource + combine) yields better coherence than single-pass distilBART.

### 8.3 Flashcard Generation

Flashcards initially used FLAN-T5 (local model). Replaced with an extractive NLTK pipeline (TF-IDF + POS tagging + pattern matching) for dramatically faster generation (1–3 s vs. 10–30 s), no model download, and no API key requirement. The trade-off is that extractive generation produces less creative questions than a generative model but is far more predictable and reliable for academic material.

### 8.4 Why Whisper tiny (Local) over a Paid Transcription API

- Whisper `tiny` is fully open-source (MIT licence), runs locally, and requires no API key.
- For clear lecture audio the `tiny` model (~39M params) provides sufficient accuracy.
- No per-minute transcription cost (important for a student-focused product).
- Trade-off: `tiny` model has lower accuracy on noisy audio compared to `base` or `small`; ffmpeg system dependency required.

### 8.5 Why Gemini for Chattie (Embeddings + Chat)

- Google's `text-embedding-004` provides 768-dimensional embeddings with a generous free tier — the only cost is API latency.
- `gemini-2.0-flash` provides fast, high-quality chat generation with a large context window suitable for RAG (can hold retrieved chunks + conversation history).
- Alternative considered: OpenAI `text-embedding-ada-002` + GPT-4o-mini — Gemini was preferred on cost grounds for the FYP.

### 8.6 Why pgvector over Pinecone or Weaviate

- pgvector is a PostgreSQL extension — the database is already Supabase-managed PostgreSQL, so adding a vector column costs nothing extra (no new service, no new pricing tier).
- Supabase exposes an `extensions.vector` type and provides the `match_resource_embeddings` RPC function natively.
- Pinecone/Weaviate would require a separate hosted vector DB service, additional env vars, and an additional monthly cost — unjustifiable for a FYP.
- `ivfflat` index with cosine similarity is sufficient for the expected data volume (hundreds, not millions, of chunks per workspace).

### 8.7 Why OpenRouter over Direct LLM APIs for Quiz/Summarization

- OpenRouter provides a unified API endpoint (`openrouter.ai/api/v1/chat/completions`) with an OpenAI-compatible interface.
- The free tier includes `meta-llama/llama-3.1-8b-instruct` with no cost at FYP usage volumes.
- Switching models in future requires only changing the `model` string — no code change.
- Alternative: direct Groq/Together.ai API. OpenRouter was preferred for its model catalogue breadth and free tier reliability.

---

## 9. Testing Strategy

### 9.1 Backend Unit & Integration Tests (Jest + Supertest)

All external I/O (Supabase, UploadThing, ML service calls, child_process spawns) is fully mocked — no live credentials required to run tests.

| Test File | Type | Coverage Area |
|---|---|---|
| `auth.middleware.unit.test.ts` | Unit | Token extraction, cookie fallback, refresh rotation |
| `resource.service.unit.test.ts` | Unit | Upload, list, delete, PDF/audio/PPTX extraction pipelines |
| `summary.service.unit.test.ts` | Unit | Generate, regenerate, delete; axios mock for OpenRouter |
| `flashcard.service.unit.test.ts` | Unit | Generate, CRUD, card status update |
| `quiz.service.unit.test.ts` | Unit | Generate, list, attempt lifecycle, topic breakdown |
| `studyRoomAI.service.unit.test.ts` | Unit | AI question generation for study rooms |
| `studyRoomBadges.unit.test.ts` | Unit | Badge assignment logic |
| `resources.integration.test.ts` | Integration | Full resource HTTP lifecycle |
| `summary.integration.test.ts` | Integration | Full summary HTTP lifecycle |
| `flashcards.integration.test.ts` | Integration | Full flashcard HTTP lifecycle |
| `quiz.integration.test.ts` | Integration | Full quiz HTTP lifecycle |
| `studyRoom.integration.test.ts` | Integration | Full study room HTTP lifecycle |

**Run commands:**
```bash
cd backend
npm test                  # all
npm run test:unit         # unit only
npm run test:integration  # integration only
npm run test:coverage     # with coverage report
```

### 9.2 E2E Testing (Playwright)

**Architecture:** Page Object Model (`frontend/tests/e2e/pages/`), global setup seeds a dedicated Supabase test project, teardown deletes all seeded data after run.

| Spec File | Test IDs | @slow Count | Coverage |
|---|---|---|---|
| `01-auth.spec.ts` | TC-AUTH-01 → 07 | 0 | Register, login, logout, session persistence |
| `02-workspace.spec.ts` | TC-WS-01 → 06 | 0 | Create, navigate, slug routing, aura theming |
| `03-resources.spec.ts` | TC-RES-01 → 09 | 0 | Upload PDF/PPTX/audio, YouTube URL, delete |
| `04-summarization.spec.ts` | TC-SUM-01 → 05 | 2 (SUM-02, SUM-03) | Generate general/custom, formats, regenerate |
| `05-quiz.spec.ts` | TC-QUIZ-01 → 07 | 2 (QUIZ-02, QUIZ-05) | Generate, attempt, submit answers, results |
| `06-flashcards.spec.ts` | TC-FLASH-01 → 06 | 1 (FLASH-02) | Generate, study mode, Known/Review tracking |
| `07-chattie.spec.ts` | TC-CHAT-01 → 06 | 1 (CHAT-02) | Embed, ask question, source references, clear history |
| `08-study-room.spec.ts` | TC-SR-01 → 10 | 2 (SR-03, SR-04) | Create, join OTP, join email, live session, results |
| **Total** | **51 tests** | **8 @slow** | |

**CI triggers:** Every PR to `main` (via GitHub Actions `.github/workflows/e2e.yml`); `@slow` tests excluded from PR runs, included in manual `workflow_dispatch` with `run_slow: true`.

**Config highlights:**
- `retries: 2` on CI (absorbs Railway cold-start flakiness)
- `timeout: 60 s` (AI endpoints legitimately take 30–60 s)
- Parallel workers: 2 on CI, 50% local
- Reporters: list + html (always), github + junit (CI only)

### 9.3 CI/CD

| Stage | Tool | Trigger |
|---|---|---|
| Lint | ESLint | Pre-commit (Husky) |
| E2E Tests | Playwright + GitHub Actions | PR to `main` / push to `main` |
| Frontend Deploy | Vercel | Auto-deploy on push to `main` and PR preview |
| Backend Deploy | Railway | Docker build on push to `main` |
| ML Deploy | Railway | Docker build on push to `main` |

---

## 10. Development Process

### 10.1 Methodology

Agile-inspired iterative development with feature-branch workflow. Each feature was developed in isolation on a `feature/*` branch, documented in `/documents`, and merged to `develop` before integration testing.

### 10.2 Tooling

| Tool | Purpose |
|---|---|
| VS Code | Primary IDE |
| GitHub | Version control, PR reviews, Issues |
| Notion | **TBD — needs Akila input** (project tracking / sprint board) |
| Claude Code (AI assistant) | AI-assisted development — code generation, debugging, architecture discussion |
| Docker Desktop | Local container orchestration |
| Railway Dashboard | Backend service management + logs |
| Vercel Dashboard | Frontend preview URLs + deployment logs |
| Supabase Dashboard | DB schema, SQL editor, Auth management, RLS policies |

### 10.3 Development Timeline

| Period | Activity |
|---|---|
| 2026-02-14 | First commit — project initialized |
| Feb–Mar 2026 | Project scaffolding, authentication, workspace management, resource upload |
| Mar–Apr 2026 | AI features: summarization, flashcards, quiz, Chattie |
| Apr 2026 | Study Rooms, voice chat, E2E test suite |
| Apr–May 2026 | Architecture refactors (unified ML service, aura scoping, OpenRouter migrations), CI/CD, deployment |
| 2026-05-09 | Latest commit (`fix: base_url issue`) |
| **Total duration** | **~3 months (Feb 14 – May 9, 2026)** |

### 10.4 AI-Assisted Development

Claude Code was used throughout development for code generation, debugging, architecture decision discussion, and documentation. The project's `CLAUDE.md` instructs the AI to analyse the full codebase before making changes and to maintain feature documentation in `/documents`.

### 10.5 Number of Sprints

**TBD — needs Akila input** (sprint count and sprint goals not visible from commit history alone).

---

## 11. Challenges & Solutions

### 11.1 Quiz `correct_option_id` Mapping Bug

**Problem:** In the original T5 pipeline, the KeyBERT-extracted keyphrase (used as the correct answer) was assembled into an options list with WordNet distractors, shuffled with `random.shuffle`, then a post-shuffle lookup was attempted via string equality. Due to text normalisation differences between KeyBERT output and assembled option text, `correct_option_id` frequently pointed at the wrong option or raised a `ValueError`.

**Solution:** Eliminated the post-hoc lookup entirely by switching to the OpenRouter full-generation pipeline. `correct_option_id` is now assigned at parse time by indexing directly into the assembled options list (`options[resolved_index].id`), making the mapping correct by construction. The bug class is architecturally impossible in the current implementation.

*Documented in:* `documents/quiz-ml-backend.md` §4.3

### 11.2 Quiz Generation Question-Count Truncation

**Problem (described in quiz-ml-backend.md):** Initial quality filtering was too aggressive — after Stage 4 filtering, the output often contained fewer questions than the user requested.

**Solution:** The LLM is now asked to generate `max(question_count + 2, floor(question_count × 1.5))` questions (over-generation) to give the quality filter room to discard weak items without falling below the user's requested count. A retry at temperature 0.9 is triggered if the first call yields too few valid questions.

### 11.3 venv Portability (Windows)

**Problem:** The Python venv at `services/ml/venv/` is not portable across machines or OS; absolute paths were baked in.

**Solution:** The root `package.json` includes `setup:ml` script (`python -m venv venv && pip install -r requirements.txt`) to rebuild the venv from scratch. The `dev:ml` script uses `venv\Scripts\python.exe` directly, referencing the local venv. The `venv/` directory is gitignored. Railway uses Docker (no venv) so portability is a development-only concern.

### 11.4 Aura Color Scoping Decision

**Problem:** The workspace aura color system (`auraHex`/`auraRgb`/`auraContrast`) was initially threaded as props through every feature component (quiz, flashcards, summaries, Chattie, resources), applying dynamic color theming to every UI element. This created significant prop-threading complexity and made the feature components visually inconsistent across aura color values.

**Solution (two-phase refactor):**
1. Phase 1 (Aura Indicator Refactor, `documents/aura-indicator-refactor.md`): Removed aura-colored CSS variable injection from the workspace shell, sidebar nav, and header. Introduced `AuraIndicator.tsx` — an 8×8px dot that shows the aura color in the workspace header and on workspace cards only.
2. Phase 2 (Aura Theme Removal, `documents/aura-theme-removal.md`, 2026-04-12): Removed `AuraProps` from all feature components (quiz, flashcards, summarization, Chattie, resources). All feature chrome now uses `--color-blue-accent` design token consistently.

*Decision rationale:* Aura color is a workspace identity indicator, not a full application theme. Consistent blue design system tokens provide better accessibility and maintainability.

### 11.5 Architecture Migration: Two ML Services → One

**Problem:** Running separate `services/quiz-ml/` (port 8001) and `services/chatie-ml/` (port 8002) doubled Railway container cost and required tracking two separate URLs (`QUIZ_ML_SERVICE_URL`, `CHATIE_ML_SERVICE_URL`) across multiple Express files.

**Solution:** Merged both FastAPI services into a single `services/ml/` container. Both routers are mounted under `/quiz/*` and `/chatie/*` prefixes. A single env var `PYTHON_ML_URL` replaces the two legacy URLs.

*Documented in:* `documents/railway-deployment/RAILWAY_DEPLOYMENT.md`

### 11.6 Summarization Migration (distilBART → OpenRouter)

**Problem:** `distilbart-cnn-12-6` required a ~500 MB model download on first run, took 1–2 seconds per summarization pass, produced lower-quality output for long academic texts, and required a Python child process — adding process-management complexity.

**Solution:** Replaced entirely with direct OpenRouter API calls from Express (`meta-llama/llama-3.1-8b-instruct`). The Python `summarize_text.py` script was deleted. Response shape unchanged, so no frontend changes were required.

### 11.7 PyTorch CPU-Only Build for Docker

**Problem:** Default `pip install torch` pulls in CUDA wheels (~2 GB) that are unusable on Railway's CPU-only containers.

**Solution:** The `services/ml/Dockerfile` installs PyTorch first from the official CPU index URL (`https://download.pytorch.org/whl/cpu`) before the main `requirements.txt` install, keeping the image size manageable.

### 11.8 Study Room Realtime Fix

**Problem:** Supabase Realtime `postgres_changes` events for `study_room_invites` were not delivered to invited users' browsers because the RLS SELECT policy only allowed the host to read invites.

**Solution:** Added a new RLS SELECT policy (`study_room_invites_select_invited`) allowing `email = auth.jwt()->>'email'` — documented in `supabase/alter_study_room_invites_dismissed.sql` along with adding the `dismissed` status to the invite status check constraint.

*Documented in:* `documents/study-room-realtime-fix.md`

---

## 12. Deployment

### 12.1 Environments

| Environment | Purpose |
|---|---|
| Local development | `npm run dev` (concurrently) or `docker compose -f docker-compose.dev.yml up --build` |
| Vercel preview | Auto-generated per PR — used for E2E CI runs |
| Production | Vercel (frontend) + Railway × 2 (backend + ML) |

### 12.2 Hosting per Service

| Service | Platform | Build | Port |
|---|---|---|---|
| Frontend | Vercel | Next.js native (standalone build) | 443 (HTTPS) |
| Express Backend | Railway | Docker multi-stage (`node:20-alpine`) | `$PORT` (3001 default) |
| Unified ML Service | Railway | Docker (`python:3.10-slim` + CPU PyTorch) | `$PORT` (8000 default) |
| Database | Supabase | Managed | 5432 |

### 12.3 Environment Variables Required

**Backend / Root `.env.local`:**

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_DB_URL` | Direct PostgreSQL connection string |
| `PYTHON_ML_URL` | Base URL of the unified FastAPI ML service |
| `UPLOADTHING_TOKEN` | UploadThing API token |
| `OPENROUTER_API_KEY` | OpenRouter API key (summarization) |
| `FRONTEND_URL` | Frontend URL (CORS, email links) |

**FastAPI ML Service (`services/ml/.env`):**

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key (quiz generation) |
| `GEMINI_API_KEY` | Google AI API key (Chattie embeddings + chat) |
| `SUPABASE_URL` | Supabase project URL (Chattie DB) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Chattie DB) |
| `PORT` | Runtime port (Railway sets automatically) |

**GitHub Actions E2E Secrets:**

| Secret | Purpose |
|---|---|
| `SUPABASE_TEST_URL` | Dedicated test Supabase project URL |
| `SUPABASE_TEST_ANON_KEY` | Test project anon key |
| `SUPABASE_TEST_SERVICE_ROLE` | Test project service role key |
| `EXPRESS_URL` | Railway Express service public URL |
| `FASTAPI_URL` | Railway ML service public URL |
| `TEST_USER_EMAIL` | E2E test user email |
| `TEST_USER_PASSWORD` | E2E test user password |
| `VERCEL_PRODUCTION_URL` | Production frontend URL |

### 12.4 Domain & DNS

**TBD — needs Akila input** (custom domain, DNS provider, Vercel domain configuration).

---

## 13. Folder Structure (Verbatim — Top 2 Levels)

```
ezy-notez/
├── CLAUDE.md
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── jest.config.ts
│   ├── package.json
│   ├── scripts/                     ← Python scripts spawned by Express
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── helpers/
│   │   │   ├── integration/
│   │   │   ├── setup.ts
│   │   │   └── unit/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── index.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── server.ts
│   │   ├── services/
│   │   ├── types/
│   │   ├── uploadthing.ts
│   │   └── utils/
│   └── tsconfig.json
├── do.js
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── docs/
│   └── PROJECT_CONTEXT_FOR_REPORT.md
├── documents/
│   ├── Project_Structure.md
│   ├── Refactor_Phase1_Analysis.md
│   ├── audio-extraction/
│   ├── aura-indicator-refactor.md
│   ├── aura-theme-removal.md
│   ├── chatie-rag-implementation.md
│   ├── codebase-overview.md
│   ├── e2e-testing-pipeline.md
│   ├── flashcards-implementation.md
│   ├── markdown-summarization.md
│   ├── playwright-e2e-testing.md
│   ├── profile-drawer.md
│   ├── quiz-aura-theme.md
│   ├── quiz-implementation.md
│   ├── quiz-ml-backend.md
│   ├── quiz-ui-redesign.md
│   ├── railway-deployment/
│   ├── settings-page.md
│   ├── study-room-backend.md
│   ├── study-room-realtime-fix.md
│   ├── study-room-route-refactor.md
│   ├── study-room-schema.md
│   ├── summarization/
│   ├── summarization-openrouter-migration.md
│   ├── test-suite.md
│   ├── voice-chat-webrtc.md
│   └── youtube-extraction/
├── frontend/
│   ├── Dockerfile
│   ├── components.json              ← shadcn/ui config
│   ├── middleware.ts                ← Supabase auth middleware
│   ├── next.config.ts
│   ├── package.json
│   ├── playwright.config.ts
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   ├── tests/
│   │   └── e2e/
│   └── tsconfig.json
├── node_modules/
├── package.json                     ← Monorepo root (concurrently, husky)
├── package-lock.json
├── replace.js
├── requirements.txt                 ← Root Python deps (Whisper, NLTK, etc.)
├── services/
│   └── ml/
│       ├── Dockerfile
│       ├── chatie/
│       ├── main.py
│       ├── quiz/
│       ├── requirements.txt
│       └── routers/
│           └── flashcards.py
├── supabase/
│   ├── alter_study_room_invites_dismissed.sql
│   ├── create_chatie_tables.sql
│   ├── create_flashcards_tables.sql
│   ├── create_profile_trigger.sql
│   ├── create_quiz_tables.sql
│   ├── create_study_room_tables.sql
│   └── create_summaries_table.sql
└── venv/                            ← Local Python venv (gitignored)
```

---

## 14. Statistics

| Metric | Value |
|---|---|
| **Total git commits** | 140 |
| **First commit** | 2026-02-14 |
| **Latest commit** | 2026-05-09 |
| **Project duration** | ~3 months (84 days) |
| **TypeScript / TSX source files** | 200 |
| **Python source files** | 17 |
| **SQL migration files** | 7 |
| **Total tracked source files (TS/TSX/PY)** | 217 |
| **Express API route files** | 9 (`analytics`, `auth`, `chatie`, `flashcard`, `quiz`, `resource`, `studyRoom`, `summary`, `workspace`) |
| **Express API endpoints (approx)** | ~55 (Auth: 3, Workspaces: 4, Resources: ~7, Summaries: 5, Flashcards: 6, Quiz: 9, Chatie proxy: 5, Study Rooms: 14+voice 3, Analytics: ~1) |
| **FastAPI endpoints** | 9 (`/health`, `/quiz/health`, `/quiz/generate-quiz`, `/chatie/health`, `/chatie/embed-resource`, `/chatie/chat`, `/chatie/chat-history` GET + DELETE, `/flashcards/*`) |
| **Database tables** | 17 |
| **E2E test cases** | 51 (8 `@slow`) |
| **Backend unit test files** | 7 |
| **Backend integration test files** | 5 |
| **Lines of code** | **TBD — needs Akila input** (cloc not run; approximate: >10,000 lines TypeScript, >2,000 lines Python) |
| **Feature documentation files** | 22 markdown files in `/documents` |

---

## 15. Open Items / Known Gaps

### Features Incomplete or Partial

| Feature | Status | Notes |
|---|---|---|
| Subscription page | UI only | `/settings/subscription` page exists but no payment integration |
| Preferences page | UI only | `/settings/preferences` exists but preferences not persisted |
| DOCX extraction | Unclear | Listed in README feature table but extraction script not confirmed in codebase |
| Workspace deletion | Partial | Settings page UI lists workspaces but delete flow needs verification |
| Analytics route | Present | `analytics.routes.ts` + `analytics.controller.ts` exist but analytics features not documented |

### Known Bugs / Limitations

| Bug / Limitation | Status |
|---|---|
| YouTube videos without captions → `status: failed` | Documented limitation; no fallback |
| WebRTC voice: mesh P2P limited to 6 participants | Warning shown in UI; architectural limit |
| Whisper `tiny` low accuracy on noisy audio | Known; documented in AUDIO_EXTRACTION.md |
| Very noisy PPTX slides may yield fewer quiz questions than requested | Mitigated by over-generation; residual edge case |

### Future Enhancements (Documented in `documents/quiz-implementation.md`)

1. Custom bear animation JSON files for more expressive Teddy Bear emotions
2. Difficulty levels for quiz questions
3. Timed quiz mode
4. Spaced repetition for failed flashcards
5. Quiz sharing between workspace members
6. Analytics dashboard for learning progress over time

---

## Questions for Akila

The following details could not be verified from the codebase and require your input for the final report:

1. **Supervisor name** — Who is your FYP supervisor at the University of Plymouth?
2. **Agile sprint structure** — How many sprints did you run? What were the sprint goals/outcomes? Was there a formal sprint backlog (Notion/Trello/GitHub Projects)?
3. **DOCX extraction** — Is DOCX text extraction implemented? If so, which library and which script?
4. **Custom domain** — Does the production deployment use a custom domain (e.g., `ezynotez.com`)? If so, what is the domain, DNS provider, and how is Vercel/email routing configured?
5. **Resend email** — Is the Resend API actually live and used for study room email invites in production? What is the `FROM` address?
6. **Analytics feature** — What does the analytics route implement? Are there any charts/stats shown to users?
7. **Lines of code** — Can you run `cloc . --exclude-dir=node_modules,.next,venv,dist` at the project root and paste the output?
8. **Original Clerk auth** — The memory index mentions "Clerk → Supabase Auth" migration. Can you confirm: did the project start with Clerk and migrate mid-development? If so, what was the reason for the migration?
9. **Session ID in Chatie** — The `chat_history` schema uses `workspace_id + user_id`; the FastAPI endpoints include a `session_id` path param. How is `session_id` generated and managed on the frontend?
10. **`routers/flashcards.py`** — The FastAPI `main.py` imports `from routers.flashcards import router as flashcards_router`. What does this router do? The root `requirements.txt` and `services/ml/requirements.txt` don't list `transformers`/`torch` for the ML service — is this flashcards router using a different approach to the backend `generate_flashcards.py` script?
11. **Study room voice: production testing** — Was the WebRTC voice channel tested in production on Railway/Vercel? Any known issues with STUN behind NAT?
12. **Project title for University submission** — Is the submission title "EZY Notez" or a longer formal title?
