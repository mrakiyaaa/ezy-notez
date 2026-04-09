# Quiz Generator ML Backend

## Overview

The Quiz Generator ML backend consists of two components:

1. **FastAPI microservice** (`services/quiz-ml/`) — runs the NLP pipeline to generate questions
2. **Express layer** (`backend/src/routes/quiz.routes.ts`, `controllers/quiz.controller.ts`, `services/quiz.service.ts`) — handles API requests, persists data to Supabase, and calls the FastAPI service

---

## Architecture

```
Frontend (Next.js)
    │  POST /api/quiz/generate
    ▼
Express Backend (port 3001)
    │  quiz.routes.ts → quiz.controller.ts → quiz.service.ts
    │  fire-and-forget pipeline:
    │    POST http://localhost:8001/generate-quiz
    ▼
FastAPI ML Service (port 8001)
    │  pipeline.py: preprocess → extract answers → generate questions
    │  → distractors → topic tags → quality filter
    ▼
Supabase (quizzes, quiz_questions, quiz_attempts tables)
```

---

## FastAPI Service (`services/quiz-ml/`)

### Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app entry point, lifespan model loading |
| `model_cache.py` | Singleton loader for T5 and KeyBERT models |
| `pipeline.py` | Full NLP pipeline (6 stages) |
| `models.py` | Pydantic request/response schemas |
| `requirements.txt` | Isolated Python dependencies |
| `Dockerfile` | Container configuration |

### Endpoints

```
GET  /health          → { status, models_loaded }
POST /generate-quiz   → { questions: [...] }
```

### NLP Pipeline Stages

1. **Preprocessing** — NLTK sentence segmentation, text cleaning, 512-token chunking
2. **Answer Extraction** — KeyBERT (`all-MiniLM-L6-v2`) extracts keyphrases per chunk
3. **Question Generation** — `valhalla/t5-base-qg-hl` with `num_beams=2`, `torch.no_grad()`
4. **Distractor Generation** — WordNet synset traversal (KeyBERT fallback)
5. **Topic Tagging** — KeyBERT top keyword per chunk
6. **Quality Filtering** — Dedup by Jaccard similarity, rank, return top N

### Models Used

| Model | Size | Purpose |
|-------|------|---------|
| `valhalla/t5-base-qg-hl` | ~900 MB | Question generation |
| `sentence-transformers/all-MiniLM-L6-v2` | ~80 MB | KeyBERT backend |
| NLTK data (punkt, wordnet, stopwords) | ~50 MB | Tokenisation, distractors |

Total cache: ~1.2 GB

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+

### Start the FastAPI service

```bash
cd services/quiz-ml

# Create isolated virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies (CPU-only torch)
pip install torch==2.4.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Set cache directory (optional — defaults to ./model-cache)
set HUGGINGFACE_CACHE_DIR=./model-cache

# Start (first run downloads ~1.2 GB of models)
uvicorn main:app --port 8001 --reload
```

### Start the Express backend

```bash
cd backend
npm install
# Ensure .env has QUIZ_ML_SERVICE_URL=http://localhost:8001
npm run dev
```

### Using Docker Compose

```bash
docker compose -f docker-compose.dev.yml up --build
```

The `quiz-ml-cache` named volume persists models across container restarts — no re-download needed.

---

## Environment Variables

### Express (`backend/.env`)

```
QUIZ_ML_SERVICE_URL=http://localhost:8001
```

### FastAPI

```
PORT=8001
HUGGINGFACE_CACHE_DIR=./model-cache
```

---

## Database Tables

All tables are in `supabase/create_quiz_tables.sql`.

### `quizzes`
Top-level quiz metadata. Status lifecycle: `pending → processing → ready | failed`.

### `quiz_questions`
Individual questions. `options` is a JSONB array `[{id, label, text}]`. `correct_option_id` is excluded from `GET /quiz/:quizId` responses to prevent cheating.

### `quiz_attempts`
User attempts. `answers` is a JSONB array `[{question_id, selected_option_id, is_correct, answered_at}]`. Scores are computed server-side on completion.

---

## API Routes

Mounted at `/api/quiz` in `backend/src/server.ts`.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/quiz/generate` | Create quiz + fire ML pipeline |
| GET | `/quiz/workspace/:workspaceId` | List quizzes with attempt data |
| GET | `/quiz/:quizId/status` | Poll generation status |
| GET | `/quiz/:quizId` | Get quiz with questions (no correct answers) |
| POST | `/quiz/:quizId/attempt` | Get or create attempt |
| PATCH | `/quiz/attempt/:attemptId/answer` | Submit one answer |
| POST | `/quiz/attempt/:attemptId/complete` | Score and complete attempt |
| GET | `/quiz/:quizId/attempt/:attemptId/results` | Full results with topic breakdown |
| DELETE | `/quiz/:quizId` | Delete quiz and all related data |

---

## Performance Notes

- **Model loading**: ~10-20 seconds on first startup (models cached locally after)
- **Question generation**: ~2-4 seconds per question on CPU
- **10 questions**: expect 25-50 seconds total generation time
- **Demo tip**: Pre-start the FastAPI service 2 minutes before the demo and pre-generate one quiz to warm up the models. Use 5 questions for the live demo for fastest results.
- **RAM**: The Python process uses ~2-3 GB RAM when models are loaded
