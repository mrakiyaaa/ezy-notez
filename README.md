# EZY-NOTEZ

> **AI-powered study platform** — turn your documents, audio, and videos into quizzes, flashcards, and summaries.

Built with **Next.js**, **Express.js**, **FastAPI**, **TypeScript**, and **Supabase**.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Project Structure](#project-structure)
7. [API Reference](#api-reference)
8. [Testing](#testing)
9. [Docker Setup](#docker-setup)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Workspace Management
- Create workspaces with unique slug-based routing
- Aura color theming — 8 colors, applied consistently across all workspace features
- Automatic slug generation with collision handling
- Per-user data isolation with Supabase Row Level Security

### AI Summarization
- **General mode** — combines all workspace resources into one consolidated summary
- **Custom mode** — select specific resources; each gets its own tabbed summary
- Three output formats: Bullet Points, Short Paragraph, Detailed
- Model: `distilbart-cnn-12-6` (abstractive) with automatic fallback to `sumy LSA` (extractive)
- Map-reduce chunking strategy for large documents

### AI Quiz Generation
- Generates MCQ, Scenario, or Mixed-type questions from workspace resources
- Powered by `valhalla/t5-base-qg-hl` (question generation) + `all-MiniLM-L6-v2` via KeyBERT (answer extraction)
- Distractors generated via WordNet synset traversal
- Topic tagging with per-topic accuracy breakdown on results
- Incremental answer persistence — resume quizzes where you left off
- Animated Teddy Bear companion with emotion states (happy, sad, celebrating, disappointed)
- Workspace aura color applied throughout the quiz UI

### Flashcard Generation
- Extractive NLP pipeline using NLTK — no API keys, no large models required
- TF-IDF sentence scoring, POS tagging, pattern-based question generation
- ~1-3 seconds generation time for 10 cards
- Study mode with flip animation, keyboard navigation, and Known / Review Later tracking
- Progress persists to database per card

### File Support & Extraction
- **PDF** — text extraction via `pdf-parse`
- **DOCX / PPTX** — text extraction from structured documents
- **Audio** (MP3, WAV, M4A, WebM, OGG) — transcription via OpenAI Whisper `tiny` model (local, no API key)
- **YouTube** — video content extraction
- All extracted text feeds into AI features automatically

### AI Chat Assistant (Chatie)
- Workspace-scoped conversational AI
- Answers questions grounded in your uploaded resources

### Study Rooms
- Live collaborative study sessions within a workspace

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript 5, Tailwind CSS 4, Zustand, Shadcn/ui |
| Backend | Express.js 5, TypeScript 5.7, ts-node-dev |
| ML Microservice | FastAPI (Python 3.11), T5, KeyBERT, NLTK, Whisper |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (JWT) |
| File Storage | UploadThing |
| Containerization | Docker (multi-stage dev + prod builds) |
| Testing | Jest + Supertest (Express), pytest + FastAPI TestClient |

---

## Architecture

```
Browser (Next.js)
    │
    ▼ HTTP / REST
Express Backend — port 3001
    │
    ├─ Supabase (PostgreSQL + Auth + Storage)
    │
    ├─ Python Scripts (child_process.spawn)
    │   ├─ summarize_text.py    — distilbart / sumy
    │   ├─ whisper_transcribe.py — Whisper tiny
    │   └─ generate_flashcards.py — NLTK extractive NLP
    │
    └─ FastAPI ML Service — port 8001
        └─ T5 + KeyBERT — quiz question generation
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop (optional, for containerized setup)
- Supabase project with API keys

### 1. Clone

```bash
git clone <repository-url>
cd ezy-notez
```

### 2. Environment Variables

Copy and fill in the template:

```bash
cp .env.example .env.local
```

Required variables — see [Environment Variables](#environment-variables) for the full list.

### 3a. Docker (Recommended)

**Development** (hot reload on all services):
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Production:**
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Services:
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| Quiz ML | http://localhost:8001 |

### 3b. Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev          # http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

**Quiz ML Microservice:**
```bash
cd services/quiz-ml
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # macOS/Linux

pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

uvicorn main:app --port 8001 --reload
# First run downloads ~1.2 GB of models — subsequent starts are fast
```

**Python scripts (summarization + flashcards + audio):**
```bash
pip install -r requirements.txt
# NLTK data (punkt, stopwords, wordnet) auto-downloads on first use
# Whisper tiny model (~75 MB) auto-downloads on first audio transcription
# distilbart model (~500 MB) auto-downloads on first summarization
```

---

## Environment Variables

### Backend / Root `.env.local`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=postgresql://user:password@db.supabase.co:5432/postgres

# ML Microservice
QUIZ_ML_SERVICE_URL=http://localhost:8001

# File Storage
UPLOADTHING_TOKEN=your_uploadthing_token
```

### FastAPI ML Service

```env
PORT=8001
HUGGINGFACE_CACHE_DIR=./model-cache
```

---

## Project Structure

```
ezy-notez/
├── backend/                          # Express.js API
│   ├── src/
│   │   ├── config/                   # Supabase client, env config
│   │   ├── controllers/              # HTTP request handlers
│   │   ├── routes/                   # Route definitions
│   │   ├── services/                 # Business logic
│   │   ├── middleware/               # Auth middleware
│   │   ├── types/                    # TypeScript definitions
│   │   ├── utils/                    # Slug generator, helpers
│   │   └── __tests__/               # Jest unit + integration tests
│   ├── scripts/
│   │   ├── summarize_text.py         # distilbart / sumy summarization
│   │   ├── whisper_transcribe.py     # Audio transcription (Whisper)
│   │   └── generate_flashcards.py    # Extractive NLP flashcard generation
│   └── Dockerfile
│
├── frontend/                         # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/              # Login / register pages
│   │   │   └── (dashboard)/         # Protected workspace pages
│   │   ├── components/
│   │   │   ├── ui/                  # Base UI components (Shadcn)
│   │   │   ├── workspace/           # Workspace feature components
│   │   │   │   ├── quiz/            # Quiz sub-components
│   │   │   │   └── flashcards/      # Flashcard sub-components
│   │   │   └── dashboard/           # Dashboard layout components
│   │   ├── lib/
│   │   │   ├── api/                 # Axios API clients
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   └── store/               # Zustand state management
│   │   ├── services/                # Frontend service layer
│   │   └── types/                   # TypeScript types
│   └── Dockerfile
│
├── services/
│   └── quiz-ml/                      # FastAPI ML microservice
│       ├── main.py                   # FastAPI app + lifespan model loading
│       ├── pipeline.py               # 6-stage NLP pipeline
│       ├── model_cache.py            # Singleton T5 + KeyBERT loader
│       ├── models.py                 # Pydantic schemas
│       ├── tests/                    # pytest unit + integration tests
│       └── Dockerfile
│
├── supabase/                         # Database migrations (SQL)
├── documents/                        # Feature implementation docs
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## API Reference

All endpoints require `Authorization: Bearer {token}` unless noted.

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |

### Workspaces
| Method | Path | Description |
|---|---|---|
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces` | List user workspaces |
| GET | `/api/workspaces/:slug` | Get workspace by slug |

### Resources
| Method | Path | Description |
|---|---|---|
| POST | `/api/resources` | Upload resource |
| GET | `/api/resources/workspace/:id` | List workspace resources |
| DELETE | `/api/resources/:id` | Delete resource |
| POST | `/api/resources/:id/extract-audio` | Trigger Whisper transcription |

### Summaries
| Method | Path | Description |
|---|---|---|
| POST | `/api/summaries/general` | Generate workspace-wide summary |
| POST | `/api/summaries/custom` | Generate per-resource summaries |
| GET | `/api/summaries/workspace/:id` | List summaries |
| POST | `/api/summaries/:id/regenerate` | Re-generate summary |
| DELETE | `/api/summaries/:id` | Delete summary |

### Flashcards
| Method | Path | Description |
|---|---|---|
| POST | `/api/flashcards/generate` | Generate flashcard set |
| GET | `/api/flashcards/workspace/:id` | List flashcard sets |
| GET | `/api/flashcards/:id` | Get set with cards |
| PATCH | `/api/flashcards/:id/cards/:cardId/status` | Update card progress |
| POST | `/api/flashcards/:id/regenerate` | Re-generate cards |
| DELETE | `/api/flashcards/:id` | Delete set |

### Quiz
| Method | Path | Description |
|---|---|---|
| POST | `/api/quiz/generate` | Generate quiz (fires ML pipeline) |
| GET | `/api/quiz/workspace/:id` | List quizzes with attempt data |
| GET | `/api/quiz/:quizId/status` | Poll generation status |
| GET | `/api/quiz/:quizId` | Get quiz with questions |
| POST | `/api/quiz/:quizId/attempt` | Get or create attempt |
| PATCH | `/api/quiz/attempt/:attemptId/answer` | Submit one answer |
| POST | `/api/quiz/attempt/:attemptId/complete` | Score and complete attempt |
| GET | `/api/quiz/:quizId/attempt/:attemptId/results` | Full results with topic breakdown |
| DELETE | `/api/quiz/:quizId` | Delete quiz |

### Quiz ML Microservice (port 8001)
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check + model status |
| POST | `/generate-quiz` | Run NLP pipeline, return questions |

---

## Testing

The test suite covers the Express API and FastAPI ML service. No frontend tests are included.

### Express (Jest + Supertest)

```bash
cd backend
npm test                  # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # With coverage report
```

**What is tested:**
- Auth middleware (token extraction, cookie fallback, refresh rotation)
- Resource service (upload, list, delete, PDF/audio/PPTX extraction pipelines)
- Summary service (generate, regenerate, delete)
- Flashcard service (generate, CRUD, card status update)
- Quiz service (generate, list, attempt lifecycle, topic breakdown)

**Mock strategy:** All external I/O is mocked — no real Supabase, UploadThing, or ML calls are made.

### FastAPI (pytest)

```bash
cd services/quiz-ml
pip install -r requirements-test.txt
pytest tests/ -v                          # All tests
pytest tests/test_pipeline_unit.py -v    # Pipeline stage unit tests
pytest tests/test_api_integration.py -v  # HTTP integration tests
```

**What is tested:**
- All 6 pipeline stages (preprocessing → answer extraction → question generation → distractors → topic tags → quality filter)
- `/health` schema, `/generate-quiz` happy path, validation errors (422), 503 when models not loaded

---

## Docker Setup

### Development (hot reload)

```bash
# Start all services
docker compose -f docker-compose.dev.yml up --build

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Access a shell
docker compose -f docker-compose.dev.yml exec backend sh
docker compose -f docker-compose.dev.yml exec frontend sh

# Stop
docker compose -f docker-compose.dev.yml down
```

Features: live HMR (frontend), ts-node-dev auto-restart (backend), model cache volume (quiz-ml).

### Production

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml down
```

Features: multi-stage optimized builds, standalone Next.js output, pre-compiled TypeScript, health checks, no dev dependencies.

### Useful Commands

| Command | Description |
|---|---|
| `docker compose ... up --build` | Build and start |
| `docker compose ... down` | Stop and remove containers |
| `docker compose ... logs -f` | Stream logs |
| `docker compose ... restart` | Restart all services |
| `docker volume prune --force` | Clean unused volumes (clears model cache) |

---

## Deployment

### Production Build

```bash
# Backend
cd backend && npm run build
docker build -t ezy-notez-backend:latest .

# Frontend
cd frontend && npm run build
docker build -t ezy-notez-frontend:latest .

# Quiz ML
cd services/quiz-ml
docker build -t ezy-notez-quiz-ml:latest .
```

### Audio Transcription on Railway / Render

Whisper requires `ffmpeg`. Add to your build command:

```bash
apt-get update && apt-get install -y ffmpeg python3 python3-pip && pip install -r requirements.txt
```

Or for Railway, use `nixpacks.toml`:

```toml
[phases.setup]
aptPkgs = ["ffmpeg", "python3", "python3-pip"]

[phases.install]
cmds = ["npm install", "pip install -r requirements.txt"]
```

---

## Troubleshooting

### Port already in use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000 && kill -9 <PID>
```

### Changes not reflecting

```bash
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml restart backend
docker volume prune --force   # last resort — clears model cache too
```

### Quiz ML — slow first start

The first startup downloads ~1.2 GB of models (T5 + MiniLM). Subsequent starts load from the `quiz-ml-cache` Docker volume. For demos, start the service 2 minutes early and pre-generate one quiz.

### Summarization — slow first run

`distilbart-cnn-12-6` (~500 MB) is downloaded on first summarization. Falls back to `sumy LSA` automatically on low-memory environments (< ~1.2 GB free RAM).

### Volume mount issues (Windows)

- Ensure Docker Desktop uses the WSL 2 backend
- Use forward slashes in paths
- Check file sharing is enabled for the project drive in Docker Desktop settings

---

## Development Guide

### Available Scripts

**Backend:**
```bash
npm run dev        # Start with ts-node-dev (auto-restart)
npm run build      # Compile TypeScript
npm start          # Run compiled output
npm test           # Run Jest tests
npm run test:coverage
```

**Frontend:**
```bash
npm run dev        # Start Next.js dev server
npm run build      # Production build
npm run lint       # ESLint
```

### Branching Convention

```
main        — production-ready releases
develop     — integration branch
feature/*   — individual features
fix/*       — bug fixes
```

### Commit Convention

```
feat: add X
fix: resolve Y
refactor: restructure Z
docs: update README
test: add tests for W
```

---

## Database Migrations

SQL migration files are in `supabase/`. Run them in order against your Supabase project:

| File | Creates |
|---|---|
| `create_workspaces_table.sql` | `workspaces` |
| `create_resources_table.sql` | `resources` |
| `create_summaries_table.sql` | `summaries` |
| `create_flashcards_tables.sql` | `flashcard_sets`, `flashcards` |
| `create_quiz_tables.sql` | `quizzes`, `quiz_questions`, `quiz_attempts` |

---

## Security

- Supabase Auth with JWT tokens (Bearer + HttpOnly cookie fallback)
- Row Level Security on all tables — users can only access their own data
- Auth middleware validates and refreshes tokens on every protected request
- No correct quiz answers exposed in GET responses (server-side scoring only)

---

## Model Resource Requirements

| Model | Size | RAM | Purpose |
|---|---|---|---|
| `valhalla/t5-base-qg-hl` | ~900 MB | ~2-3 GB | Quiz question generation |
| `all-MiniLM-L6-v2` (KeyBERT) | ~80 MB | included above | Answer extraction + topic tagging |
| `distilbart-cnn-12-6` | ~500 MB | ~1.2 GB | Summarization |
| `sumy LSA` | negligible | negligible | Summarization fallback |
| Whisper `tiny` | ~75 MB | ~1 GB | Audio transcription |
| NLTK data | ~50 MB | minimal | Flashcard NLP, tokenization |

---

## License

ISC

---

**Last Updated:** April 2026 | **Status:** Active Development
