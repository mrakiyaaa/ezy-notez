<div align="center">

<br/>

<img src="frontend/public/images/logo/logo.svg" alt="Ezy Notez" width="220" />

### *Transform your documents, audio & videos into quizzes, flashcards and summaries — powered by AI.*

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Express](https://img.shields.io/badge/Express.js_5-404040?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-507DBC?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Status](https://img.shields.io/badge/Status-Active_Development-507DBC?style=for-the-badge)](.)

<br/>

</div>

---

## 📋 Table of Contents

| | Section |
|---|---|
| ✨ | [Features](#-features) |
| 🛠️ | [Tech Stack](#️-tech-stack) |
| 🏗️ | [Architecture](#️-architecture) |
| 🚀 | [Quick Start](#-quick-start) |
| 🔑 | [Environment Variables](#-environment-variables) |
| 📁 | [Project Structure](#-project-structure) |
| 🔌 | [API Reference](#-api-reference) |
| 🧪 | [Testing](#-testing) |
| 🐳 | [Docker Setup](#-docker-setup) |
| 🚢 | [Deployment](#-deployment) |
| 🔒 | [Security](#-security) |
| 🤖 | [AI Model Resources](#-ai-model-resources) |
| 🔧 | [Troubleshooting](#-troubleshooting) |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🗂️ Workspace Management
Create personalised study hubs with **aura color theming** — 8 unique color auras applied consistently across every feature. Slug-based routing, collision-safe generation, and per-user data isolation via Supabase Row Level Security.

</td>
<td width="50%">

### 📝 AI Summarization
Generate consolidated or per-resource summaries in three formats: **Bullet Points**, **Short Paragraph**, or **Detailed**. Powered by `distilbart-cnn-12-6` with automatic fallback to `sumy LSA` for low-memory environments.

</td>
</tr>
<tr>
<td width="50%">

### 🧠 AI Quiz Generation
MCQ, Scenario, or Mixed-type questions generated from your resources via OpenRouter LLM. Features topic tagging, per-topic accuracy breakdown, incremental answer persistence, and an **animated Teddy Bear companion** with emotion states.

</td>
<td width="50%">

### 🃏 Flashcard Generation
Extractive NLP pipeline using NLTK — no API keys required. TF-IDF scoring, POS tagging, and pattern-based question generation. Study mode includes flip animation, keyboard navigation, and **Known / Review Later** progress tracking.

</td>
</tr>
<tr>
<td width="50%">

### 📎 Multi-Format File Support
| Format | Method |
|---|---|
| PDF | `pdf-parse` text extraction |
| DOCX / PPTX | Structured document parsing |
| Audio (MP3, WAV, M4A…) | Whisper `tiny` transcription |
| YouTube | Video content extraction |

</td>
<td width="50%">

### 💬 Chattie — AI Chat Assistant
Workspace-scoped conversational AI grounded in your uploaded resources. Built on **Gemini embeddings + pgvector** for retrieval-augmented generation. Ask questions, get explanations, and explore your material naturally.

</td>
</tr>
<tr>
<td colspan="2">

### 🎮 Study Rooms
Live collaborative study sessions within a workspace — study together with peers in real time.

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | Next.js 16, React 19, TypeScript 5 | App framework, SSR, routing |
| **UI** | Tailwind CSS 4, shadcn/ui, Framer Motion | Styling, components, animations |
| **State** | Zustand | Client-side state management |
| **Backend** | Express.js 5, TypeScript 5.7, ts-node-dev | REST API server |
| **ML Service** | FastAPI (Python 3.11) | Unified AI microservice |
| **AI / NLP** | OpenRouter LLM, Gemini, Whisper tiny, NLTK, KeyBERT | Question gen, chat, transcription, flashcards |
| **Database** | Supabase (PostgreSQL + pgvector) | Data storage, vector search |
| **Auth** | Supabase Auth (JWT) | Authentication & session management |
| **Storage** | UploadThing | File uploads & hosting |
| **Containers** | Docker, Docker Compose | Dev & production orchestration |
| **Testing** | Jest + Supertest | Express API test suite |

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js 16)                  │
│              React 19 · Tailwind 4 · Zustand             │
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
│   Supabase   │ │ Python Scripts│  │  FastAPI ML  :8000   │
│  PostgreSQL  │ │ (child_process│  │                     │
│  + pgvector  │ │  .spawn)      │  │  /quiz              │
│  + Auth      │ │               │  │    OpenRouter LLM   │
│  + RLS       │ │  summarize_   │  │    Question Gen     │
└──────────────┘ │  text.py      │  │                     │
                 │  whisper_     │  │  /chatie            │
                 │  transcribe.py│  │    Gemini Embeddings│
                 │  generate_    │  │    pgvector RAG     │
                 │  flashcards.py│  └─────────────────────┘
                 └───────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker Desktop** (optional, for containerised setup)
- A **Supabase** project with API keys

### 1 — Clone

```bash
git clone <repository-url>
cd ezy-notez
```

### 2 — Environment Variables

```bash
cp .env.example .env.local
# Fill in the required values — see Environment Variables section
```

---

### 3a — Docker (Recommended)

> One command spins up all three services with hot reload.

**Development** (hot reload on all services):
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Production:**
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| ML Microservice | http://localhost:8000 |

---

### 3b — Manual Local Setup

<details>
<summary><strong>Backend (Express.js)</strong></summary>

```bash
cd backend
npm install
npm run dev          # http://localhost:3001
```
</details>

<details>
<summary><strong>Frontend (Next.js)</strong></summary>

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```
</details>

<details>
<summary><strong>ML Microservice (FastAPI — Quiz + Chattie)</strong></summary>

```bash
cd services/ml
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

Requires: `OPENROUTER_API_KEY` (quiz) · `GEMINI_API_KEY` + Supabase credentials (chattie)
</details>

<details>
<summary><strong>Python Scripts (summarization, flashcards, audio)</strong></summary>

```bash
pip install -r requirements.txt
# NLTK data (punkt, stopwords, wordnet) — auto-downloads on first use
# Whisper tiny (~75 MB)              — auto-downloads on first audio transcription
# distilbart (~500 MB)               — auto-downloads on first summarization
```
</details>

---

## 🔑 Environment Variables

### Backend / Root `.env.local`

```env
# ── Supabase ──────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=postgresql://user:password@db.supabase.co:5432/postgres

# ── ML Microservice ───────────────────────────────
PYTHON_ML_URL=http://localhost:8000

# ── File Storage ──────────────────────────────────
UPLOADTHING_TOKEN=your_uploadthing_token
```

### FastAPI ML Service (`services/ml/.env`)

```env
PORT=8000
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📁 Project Structure

```
ezy-notez/
│
├── 🖥️  frontend/                         Next.js Application
│   └── src/
│       ├── app/
│       │   ├── (auth)/                   Login · Register
│       │   └── (dashboard)/              Protected workspace pages
│       ├── components/
│       │   ├── ui/                       Base UI (shadcn)
│       │   ├── workspace/                Workspace feature components
│       │   │   ├── quiz/                 Quiz sub-components
│       │   │   └── flashcards/           Flashcard sub-components
│       │   └── dashboard/               Dashboard layout components
│       ├── lib/
│       │   ├── animations.ts             Framer Motion variants
│       │   ├── api/                      Axios API clients
│       │   ├── hooks/                    Custom React hooks
│       │   └── store/                   Zustand state management
│       └── types/                        TypeScript types
│
├── ⚙️  backend/                           Express.js API
│   ├── src/
│   │   ├── config/                       Supabase client, env config
│   │   ├── controllers/                  HTTP request handlers
│   │   ├── routes/                       Route definitions
│   │   ├── services/                     Business logic
│   │   ├── middleware/                   Auth middleware
│   │   └── __tests__/                   Jest unit + integration tests
│   └── scripts/
│       ├── summarize_text.py             distilbart / sumy summarization
│       ├── whisper_transcribe.py         Audio → text (Whisper)
│       └── generate_flashcards.py        Extractive NLP flashcards
│
├── 🤖  services/ml/                       Unified FastAPI ML Microservice
│   ├── main.py                           Mounts /quiz and /chatie routers
│   ├── quiz/                             OpenRouter question generation
│   ├── chatie/                           Gemini embeddings + pgvector RAG
│   └── Dockerfile
│
├── 🗄️  supabase/                          SQL migration files
├── 📄  documents/                         Feature implementation docs
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## 🔌 API Reference

> All endpoints require `Authorization: Bearer {token}` unless noted.

<details>
<summary><strong>🔐 Authentication</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |

</details>

<details>
<summary><strong>🗂️ Workspaces</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/workspaces` | Create workspace |
| `GET` | `/api/workspaces` | List user workspaces |
| `GET` | `/api/workspaces/:slug` | Get workspace by slug |

</details>

<details>
<summary><strong>📎 Resources</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/resources` | Upload resource |
| `GET` | `/api/resources/workspace/:id` | List workspace resources |
| `DELETE` | `/api/resources/:id` | Delete resource |
| `POST` | `/api/resources/:id/extract-audio` | Trigger Whisper transcription |

</details>

<details>
<summary><strong>📝 Summaries</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/summaries/general` | Generate workspace-wide summary |
| `POST` | `/api/summaries/custom` | Generate per-resource summaries |
| `GET` | `/api/summaries/workspace/:id` | List summaries |
| `POST` | `/api/summaries/:id/regenerate` | Re-generate summary |
| `DELETE` | `/api/summaries/:id` | Delete summary |

</details>

<details>
<summary><strong>🃏 Flashcards</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/flashcards/generate` | Generate flashcard set |
| `GET` | `/api/flashcards/workspace/:id` | List flashcard sets |
| `GET` | `/api/flashcards/:id` | Get set with cards |
| `PATCH` | `/api/flashcards/:id/cards/:cardId/status` | Update card progress |
| `POST` | `/api/flashcards/:id/regenerate` | Re-generate cards |
| `DELETE` | `/api/flashcards/:id` | Delete set |

</details>

<details>
<summary><strong>🧠 Quiz</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/quiz/generate` | Generate quiz (fires ML pipeline) |
| `GET` | `/api/quiz/workspace/:id` | List quizzes with attempt data |
| `GET` | `/api/quiz/:quizId/status` | Poll generation status |
| `GET` | `/api/quiz/:quizId` | Get quiz with questions |
| `POST` | `/api/quiz/:quizId/attempt` | Get or create attempt |
| `PATCH` | `/api/quiz/attempt/:attemptId/answer` | Submit one answer |
| `POST` | `/api/quiz/attempt/:attemptId/complete` | Score and complete attempt |
| `GET` | `/api/quiz/:quizId/attempt/:attemptId/results` | Full results with topic breakdown |
| `DELETE` | `/api/quiz/:quizId` | Delete quiz |

</details>

<details>
<summary><strong>🤖 ML Microservice (port 8000)</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/quiz/health` | Quiz subservice health |
| `POST` | `/quiz/generate-quiz` | Generate questions (OpenRouter LLM) |
| `POST` | `/chatie/embed-resource` | Embed resource for RAG retrieval |
| `POST` | `/chatie/chat` | RAG chat turn (Gemini) |
| `GET` | `/chatie/chat-history/:workspaceId/:userId/:sessionId` | Fetch chat history |
| `DELETE` | `/chatie/chat-history/:workspaceId/:userId/:sessionId` | Clear chat history |

</details>

---

## 🧪 Testing

The test suite covers the Express API. All external I/O (Supabase, UploadThing, ML calls) is fully mocked — no live credentials required to run tests.

```bash
cd backend
npm test                   # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # With coverage report
```

**Coverage areas:**

| Area | What's tested |
|---|---|
| Auth middleware | Token extraction, cookie fallback, refresh rotation |
| Resources | Upload, list, delete, PDF/audio/PPTX extraction pipelines |
| Summaries | Generate, regenerate, delete |
| Flashcards | Generate, CRUD, card status update |
| Quiz | Generate, list, attempt lifecycle, topic breakdown |

---

## 🐳 Docker Setup

### Development (hot reload)

```bash
# Start all services with hot reload
docker compose -f docker-compose.dev.yml up --build

# Useful commands
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml exec backend sh
docker compose -f docker-compose.dev.yml down
```

Features: **live HMR** (frontend) · **ts-node-dev** auto-restart (backend) · model cache volume (ML)

### Production

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml down
```

Features: multi-stage optimised builds · standalone Next.js · pre-compiled TypeScript · health checks · no dev dependencies

### Reference

| Command | Description |
|---|---|
| `docker compose ... up --build` | Build and start all services |
| `docker compose ... down` | Stop and remove containers |
| `docker compose ... logs -f` | Stream logs |
| `docker compose ... restart` | Restart all services |
| `docker volume prune --force` | Clean unused volumes (clears model cache) |

---

## 🚢 Deployment

```bash
# Backend
cd backend && npm run build
docker build -t ezy-notez-backend:latest .

# Frontend
cd frontend && npm run build
docker build -t ezy-notez-frontend:latest .

# ML Service
cd services/ml
docker build -t ezy-notez-ml:latest .
```

> **Audio on Railway / Render** — Whisper requires `ffmpeg`. Add to your build command:
> ```bash
> apt-get update && apt-get install -y ffmpeg
> ```
> Or via `nixpacks.toml` for Railway — set `aptPkgs = ["ffmpeg"]` in `[phases.setup]`.

---

## 🔒 Security

- **Supabase Auth** — JWT tokens via Bearer header + HttpOnly cookie fallback
- **Row Level Security** — all tables enforce per-user data isolation at the database level
- **Auth middleware** — validates and refreshes tokens on every protected request
- **Server-side scoring** — correct quiz answers are never exposed in GET responses

---

## 🤖 AI Model Resources

| Model | Size | RAM | Purpose |
|---|---|---|---|
| `valhalla/t5-base-qg-hl` | ~900 MB | ~2–3 GB | Quiz question generation |
| `all-MiniLM-L6-v2` (KeyBERT) | ~80 MB | included above | Answer extraction + topic tagging |
| `distilbart-cnn-12-6` | ~500 MB | ~1.2 GB | Summarization |
| `sumy LSA` | negligible | negligible | Summarization fallback |
| Whisper `tiny` | ~75 MB | ~1 GB | Audio transcription |
| NLTK data | ~50 MB | minimal | Flashcard NLP, tokenisation |

> All models auto-download on first use. Ensure sufficient disk space before first run.

---

## 🔧 Troubleshooting

<details>
<summary><strong>Port already in use</strong></summary>

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS / Linux
lsof -i :3000 && kill -9 <PID>
```
</details>

<details>
<summary><strong>Changes not reflecting</strong></summary>

```bash
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml restart backend
docker volume prune --force   # last resort — also clears model cache
```
</details>

<details>
<summary><strong>ML service — missing API keys</strong></summary>

The ML service calls OpenRouter and Gemini directly — no local model weights are downloaded on startup. Ensure `OPENROUTER_API_KEY` and `GEMINI_API_KEY` are set in your environment or `.env` file.
</details>

<details>
<summary><strong>Summarization — slow first run</strong></summary>

`distilbart-cnn-12-6` (~500 MB) downloads on first summarization. The service automatically falls back to `sumy LSA` on low-memory environments (< ~1.2 GB free RAM).
</details>

<details>
<summary><strong>Volume mount issues on Windows</strong></summary>

- Ensure Docker Desktop is using the **WSL 2 backend**
- Use forward slashes in all paths
- Confirm file sharing is enabled for the project drive in Docker Desktop → Settings → Resources
</details>

---

## 👩‍💻 Development Guide

### Scripts

**Backend:**
```bash
npm run dev            # ts-node-dev with auto-restart
npm run build          # Compile TypeScript
npm start              # Run compiled output
npm test               # Jest test suite
npm run test:coverage  # With coverage report
```

**Frontend:**
```bash
npm run dev            # Next.js dev server
npm run build          # Production build
npm run lint           # ESLint
```

### Branching Convention

```
main        →  production-ready releases
develop     →  integration branch
feature/*   →  new features
fix/*       →  bug fixes
```

### Commit Convention

```
feat:      add new feature
fix:       resolve a bug
refactor:  restructure code without behaviour change
docs:      documentation updates
test:      add or update tests
```

### Database Migrations

SQL files live in `supabase/`. Run them **in order** against your Supabase project:

| File | Creates |
|---|---|
| `create_workspaces_table.sql` | `workspaces` |
| `create_resources_table.sql` | `resources` |
| `create_summaries_table.sql` | `summaries` |
| `create_flashcards_tables.sql` | `flashcard_sets`, `flashcards` |
| `create_quiz_tables.sql` | `quizzes`, `quiz_questions`, `quiz_attempts` |

---

<div align="center">

<br/>

**Built with ♥ using Next.js · Express · FastAPI · Supabase**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

<br/>

*Last updated: April 2026 &nbsp;·&nbsp; Status: Active Development*

</div>
