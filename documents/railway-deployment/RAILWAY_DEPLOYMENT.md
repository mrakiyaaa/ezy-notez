# Railway Deployment — Backend & Unified ML Service

This document explains how the EZY Notez backend is packaged for Railway
deployment with Docker. It covers the unified ML service that merges the
previous Quiz ML and Chatie ML microservices, the two Dockerfiles, and the
environment-variable changes required in the Express API.

## Overview

The backend is split into two deployable containers:

| Service | Directory | Base image | Port | Purpose |
| --- | --- | --- | --- | --- |
| Express API | `backend/` | `node:20-alpine` | `3001` (or `$PORT`) | REST API, auth, resource orchestration |
| Unified ML | `services/ml/` | `python:3.10-slim` | `8000` (or `$PORT`) | Quiz generation + Chatie RAG chat |

Each service is a single Railway service with its own Dockerfile, picked up
automatically by Railway when the repository's root is set to the service
directory.

## 1. Unified ML Service

### Why merge?

Running two Python microservices (Quiz ML on `:8001`, Chatie ML on `:8002`)
doubles container overhead, doubles Railway cost, and forces the backend to
track two URLs. Both services share Python tooling (FastAPI, Pydantic,
uvicorn) and the models are small — combining them into one container
is strictly cheaper and simpler.

### Structure

```
services/ml/
├── Dockerfile
├── .dockerignore
├── requirements.txt
├── main.py                  # FastAPI app entry point + /health
├── quiz/
│   ├── __init__.py
│   ├── router.py            # /quiz/* routes
│   ├── pipeline.py          # OpenRouter-driven quiz generation pipeline
│   └── models.py            # Pydantic request/response schemas
└── chatie/
    ├── __init__.py
    ├── router.py            # /chatie/* routes
    ├── db.py                # Supabase client singleton
    ├── embeddings.py        # Gemini embedding helpers
    └── models.py            # Pydantic request/response schemas
```

### Endpoints

Request and response contracts are unchanged from the original separate
services — only the URL path was prefixed with `/quiz` or `/chatie`.

| Method | Path | Previous path | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | (new) | Top-level readiness probe — returns `{"status": "ok"}` |
| `GET` | `/quiz/health` | `/health` (Quiz ML) | Backwards-compatible quiz health |
| `POST` | `/quiz/generate-quiz` | `/generate-quiz` (Quiz ML) | Generate a quiz from extracted text |
| `GET` | `/chatie/health` | `/health` (Chatie ML) | Backwards-compatible chatie health |
| `POST` | `/chatie/embed-resource` | `/embed-resource` (Chatie ML) | Embed and store resource chunks |
| `POST` | `/chatie/chat` | `/chat` (Chatie ML) | RAG chat with resources in workspace |
| `GET` | `/chatie/chat-history/{workspace_id}/{user_id}/{session_id}` | same (Chatie ML) | Fetch chat history for a session |
| `DELETE` | `/chatie/chat-history/{workspace_id}/{user_id}/{session_id}` | same (Chatie ML) | Clear chat history for a session |

### Startup behaviour

On FastAPI lifespan startup the service:
1. Downloads NLTK `punkt` / `punkt_tab` tokenizer data (used by the quiz
   preprocessing pipeline). Build-time pre-download in the Dockerfile means
   this is almost always a no-op at runtime.
2. Logs warnings for any missing optional env vars (`OPENROUTER_API_KEY`,
   `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) instead of
   failing — the affected endpoints will return `503` on call but other
   routers keep working.
3. Whisper `tiny` is pre-downloaded at build time and is loaded lazily only
   when first used, to keep idle RAM low on Railway's smaller plans.

### Required environment variables

| Name | Required | Used by | Notes |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | quiz | `/quiz/generate-quiz` | OpenRouter API token |
| `GEMINI_API_KEY` | chatie | `/chatie/embed-resource`, `/chatie/chat` | Google AI Studio key |
| `SUPABASE_URL` | chatie | `/chatie/*` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | chatie | `/chatie/*` | Supabase service-role key (bypasses RLS) |
| `PORT` | optional | all | Railway sets this automatically; defaults to `8000` locally |

## 2. Dockerfiles

### Python ML Dockerfile (`services/ml/Dockerfile`)

Key steps:
1. Base: `python:3.10-slim`.
2. Install `build-essential`, `ffmpeg`, and `git` (ffmpeg is required by
   Whisper for audio decoding; git is required by `openai-whisper`'s
   `triton` optional path).
3. **Install CPU-only PyTorch first** via the official CPU index URL. This
   prevents pip from pulling in CUDA wheels (~2 GB) that Railway cannot use.
4. Install the merged `requirements.txt`.
5. Pre-download the Whisper `tiny` model at build time so the first request
   does not pay the download cost.
6. Pre-download NLTK tokenizer data at build time.
7. Expose port `8000`.
8. Launch uvicorn on `0.0.0.0`, honouring `$PORT` for Railway compatibility.

### Express Dockerfile (`backend/Dockerfile`)

The existing multi-stage Dockerfile is already production-ready — no
changes needed for Railway. Stages:

- `base`: copies `package*.json`
- `dev`: installs all deps and runs `ts-node-dev` (used by `docker-compose.dev.yml`)
- `builder`: compiles TypeScript to `dist/`
- `prod`: final stage — `node:20-alpine` + compiled `dist/` + production
  `node_modules` + `package.json`. CMD is `npm start` which runs
  `node dist/index.js`.

Railway builds the final stage (`prod`) by default, so no target flag is
required. The service exposes port `3001`; Railway will set `$PORT` and
`server.ts` reads `process.env.PORT`.

## 3. Environment variable consolidation (Express API)

The Express codebase previously tracked two separate ML URLs:

| Old env var | Default | Used in |
| --- | --- | --- |
| `QUIZ_ML_SERVICE_URL` | `http://localhost:8001` | `backend/src/services/quiz.service.ts` |
| `CHATIE_ML_SERVICE_URL` | `http://127.0.0.1:8002` | `backend/src/controllers/chatie.controller.ts`, `backend/src/services/resource.service.ts` |

These were replaced with a single variable:

| New env var | Default | Used by |
| --- | --- | --- |
| `PYTHON_ML_URL` | `http://localhost:8000` | Quiz service, Chatie controller, resource service |

Each caller derives the per-router base URL internally:

```ts
const PYTHON_ML_URL = process.env.PYTHON_ML_URL || "http://localhost:8000";
const QUIZ_ML_BASE_URL   = `${PYTHON_ML_URL.replace(/\/+$/, "")}/quiz`;
const CHATIE_ML_BASE_URL = `${PYTHON_ML_URL.replace(/\/+$/, "")}/chatie`;
```

All subsequent HTTP calls continue to use the same path suffixes they always
did (`/generate-quiz`, `/embed-resource`, `/chat`, `/chat-history/...`), so
no request or response contract changed.

### Files updated

- `backend/src/services/quiz.service.ts` — swapped `QUIZ_ML_SERVICE_URL` for
  `QUIZ_ML_BASE_URL` built from `PYTHON_ML_URL`.
- `backend/src/controllers/chatie.controller.ts` — swapped
  `CHATIE_ML_SERVICE_URL` for `CHATIE_ML_BASE_URL` built from `PYTHON_ML_URL`.
- `backend/src/services/resource.service.ts` — same chatie swap for the
  fire-and-forget `triggerEmbedding` call.

## 4. Local development

Two supported flows exist:

### A. Docker Compose (recommended for integration testing)

The existing `docker-compose.dev.yml` / `docker-compose.prod.yml` still work
for the backend and frontend. To run the merged ML service locally alongside
them, either:
- add a `ml` service that builds `./services/ml` and exposes `8000:8000`, OR
- run the ML container standalone: `docker build -t ezynotes-ml ./services/ml && docker run --env-file services/ml/.env -p 8000:8000 ezynotes-ml`.

Set `PYTHON_ML_URL=http://ml:8000` (inside docker network) or
`PYTHON_ML_URL=http://localhost:8000` (host network) for the backend.

### B. Native Python (fastest iteration on the ML code)

```bash
cd services/ml
python -m venv venv
venv\Scripts\activate          # on Windows
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
python main.py                 # binds to 0.0.0.0:8000
```

## 5. Railway deployment steps

1. **Create the ML service** on Railway. Point it at this repo, set the root
   directory to `services/ml`. Railway detects the Dockerfile automatically.
2. Set the required env vars (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Do not set `PORT` — Railway
   injects it.
3. **Create the backend service** on Railway, root directory `backend`.
4. Set `PYTHON_ML_URL` to the internal URL of the ML service (use Railway's
   internal networking hostname, e.g. `http://${{ml.RAILWAY_PRIVATE_DOMAIN}}:8000`
   or the public domain if internal networking is not enabled).
5. Set the remaining backend env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `FRONTEND_URL`, and any
   third-party credentials (UploadThing, Resend).
6. Hit `GET /health` on both services after deploy to verify readiness.

## 6. Legacy directories

`services/quiz-ml/` and `services/chatie-ml/` are now superseded by
`services/ml/`. They remain in-tree for reference and can be removed once
the unified service has run in production for a release cycle. No Railway
service should be pointed at those old directories.
