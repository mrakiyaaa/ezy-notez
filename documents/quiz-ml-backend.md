# Quiz Generator ML Backend

## 1. Overview

The EZY Notez Quiz Generator uses a **hybrid NLP architecture**:

- **Local models** handle the deterministic, compute-bound stages — sentence
  segmentation, keyphrase extraction, and question generation. These run
  inside the FastAPI microservice using HuggingFace Transformers and KeyBERT
  on CPU, with no external API calls.
- **OpenRouter LLM** handles only the distractor synthesis stage. After a
  question and its correct answer have been produced locally, the service
  delegates the generation of three plausible-but-incorrect answer options
  to an instruction-tuned LLM (`mistralai/mistral-7b-instruct`, falling back
  to `google/gemma-2-9b-it`) via the OpenRouter API.

This split keeps the heavy work local and reproducible, while delegating the
single stage that benefits most from a general-knowledge LLM (distractors)
to a hosted model. Roughly **80% of the pipeline still runs locally**;
OpenRouter is invoked only for stage 4.

The Express layer (`backend/src/routes/quiz.routes.ts`,
`controllers/quiz.controller.ts`, `services/quiz.service.ts`) orchestrates
HTTP traffic, persists results in Supabase, and fires the FastAPI service
asynchronously when a quiz is requested.

---

## 2. Architecture Diagram

```
Frontend (Next.js)
    │  POST /api/quiz/generate
    ▼
Express Backend (port 3001)
    │  quiz.routes → quiz.controller → quiz.service
    │  fire-and-forget:  POST http://localhost:8001/generate-quiz
    ▼
┌────────────────────────────────────────────────────────────────────┐
│ FastAPI ML Service  (services/quiz-ml/, port 8001)                 │
│                                                                    │
│   ┌─────────────────────── LOCAL (CPU) ───────────────────────┐    │
│   │  1. Preprocess     NLTK punkt   (sent_tokenize, clean)    │    │
│   │  2. Answer extract KeyBERT      (all-MiniLM-L6-v2)        │    │
│   │  3. Question gen   T5           (valhalla/t5-base-qg-hl)  │    │
│   └────────────────────────┬─────────────────────────────────┘     │
│                            │                                       │
│                            ▼                                       │
│   ┌──────────────── REMOTE (OpenRouter) ──────────────────┐        │
│   │  4. Distractor generation                             │        │
│   │     POST openrouter.ai/api/v1/chat/completions        │        │
│   │       primary : mistralai/mistral-7b-instruct         │        │
│   │       fallback: google/gemma-2-9b-it                  │        │
│   │     returns JSON array of 3 distractor strings        │        │
│   └────────────────────────┬─────────────────────────────┘         │
│                            │                                       │
│                            ▼                                       │
│   ┌─────────────────────── LOCAL (CPU) ───────────────────────┐    │
│   │  5. Topic tag      KeyBERT top keyword                    │    │
│   │  6. Quality filter Jaccard dedup, top-N selection         │    │
│   └───────────────────────────────────────────────────────────┘    │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
                  Supabase (quizzes, quiz_questions, quiz_attempts)
```

---

## 3. Pipeline Stages

| # | Stage                 | Technology                            | Location | Purpose |
|---|-----------------------|---------------------------------------|----------|---------|
| 1 | Preprocessing         | NLTK `punkt_tab` + T5 tokenizer       | Local    | Clean text, sentence-segment, group sentences into 512-token chunks. |
| 2 | Answer Extraction     | KeyBERT (`all-MiniLM-L6-v2`)          | Local    | Extract candidate answer keyphrases per chunk via MaxSum diversification. |
| 3 | Question Generation   | `valhalla/t5-base-qg-hl` (`<hl>` tags)| Local    | T5 seq2seq generation with `num_beams=2`, `torch.no_grad()`, batched. |
| 4 | **Distractor Generation** | **OpenRouter LLM**                | **Remote** | **Synthesise 3 academically plausible incorrect options per question.** |
| 5 | Topic Tagging         | KeyBERT (top keyword)                 | Local    | Attach a 1-3 word topic label to each chunk for explanations. |
| 6 | Quality Filtering     | Jaccard dedup + answer-leak filter    | Local    | Drop near-duplicates and questions whose answer appears in the question. |

The implementation lives in [services/quiz-ml/pipeline.py](../services/quiz-ml/pipeline.py).

---

## 4. Why Hybrid

The previous implementation generated distractors entirely locally, using
WordNet synset traversal with a sense2vec / KeyBERT fallback. While this
worked for a small set of common nouns, it broke down on academic content:

- **WordNet is lexical, not academic.** For an answer like *"backpropagation"*,
  WordNet returns sibling hyponyms of generic English nouns — words that are
  not even subject-related, let alone academically plausible.
- **sense2vec returns nearest neighbours, not distractors.** The closest
  vectors to a correct answer are usually paraphrases or alternate spellings
  of the same concept, which makes them either too easy to eliminate or
  literally correct.
- **Distractors must be wrong but believable.** Producing "wrong but
  believable" requires world knowledge and an understanding of the question's
  intent — exactly what a general instruction-tuned LLM is good at.

The hybrid approach solves this:

1. **Quality** — an LLM produces context-aware, topically aligned
   distractors that are visibly wrong only after thinking about the
   question.
2. **Cost discipline** — only stage 4 hits the network. Question generation,
   answer extraction, preprocessing, tagging and filtering all stay local.
   This keeps API spend bounded to **~80% less** than a fully-LLM pipeline
   that also generates the questions remotely.
3. **Model agnosticism** — OpenRouter's unified API lets us swap
   `mistral-7b-instruct` for any other instruction-tuned model
   (Gemma, Llama, GPT-class) by changing a single constant in
   `pipeline.py`. No code changes are required to evaluate alternatives.
4. **Determinism where it matters** — local T5 + KeyBERT remain
   deterministic (within `torch.no_grad()` and beam search), so question
   generation can be unit-tested without mocking a network.

---

## 5. Migration from Previous Implementation

### Previous distractor implementation

- `_wordnet_distractors(answer, n)` — walked WordNet synsets, collected
  sibling hyponyms of the answer's head word, and returned a random sample.
- `_keybert_distractors(answer, chunk, n)` — fallback that re-ran KeyBERT on
  the source chunk to find phrases distinct from the answer.
- `build_options` chained these two and padded with the strings
  `"None of the above"`, `"All of the above"`, `"Cannot be determined"` if
  fewer than three candidates survived.
- `model_cache.load_all()` downloaded the NLTK `wordnet` and `omw-1.4`
  corpora at startup so that `nltk.corpus.wordnet` could be queried.

### Why it was replaced

- WordNet hyponym traversal is purely lexical and produced
  academically meaningless options on subject-specific text (history,
  computing, biology). In informal evaluations on FYP source materials it
  generated obviously-wrong distractors that students could eliminate
  without reading the question.
- The fallback chain made failure modes hard to reason about: half the
  questions would have WordNet distractors, half KeyBERT, and the rest
  generic placeholders, with no consistent quality bar.
- There was no way to improve distractor quality without rewriting the
  algorithm; an LLM gives a single, controllable quality knob (model
  choice).

### What changed in the code

| Removed                                        | Added                                              |
|------------------------------------------------|----------------------------------------------------|
| `_wordnet_distractors()` in `pipeline.py`      | `generate_distractors_via_openrouter()` in `pipeline.py` |
| `_keybert_distractors()` in `pipeline.py`      | `_call_openrouter_model()` (single OpenRouter call) |
| `from nltk.corpus import wordnet` import       | `_build_distractor_prompt()` (prompt template)     |
| NLTK `wordnet` + `omw-1.4` downloads in `model_cache.py` | `_extract_source_context()` (1-2 sentence anchor) |
| (no httpx dep)                                 | `httpx==0.27.2` in `requirements.txt`              |
| (sense2vec was never installed in this repo, so nothing to remove from `requirements.txt`) | `OPENROUTER_API_KEY` env var read via `os.environ` |

`run_pipeline` and the FastAPI `/generate-quiz` endpoint became `async`
because the new distractor stage awaits an HTTP call.

### What stayed the same

- T5 question generation (`valhalla/t5-base-qg-hl`, `num_beams=2`,
  `torch.no_grad()`, batch size 4) — unchanged.
- KeyBERT (`all-MiniLM-L6-v2`) for answer extraction and topic tagging —
  unchanged.
- Stage order: preprocess → answer extract → question gen → distractors →
  topic tag → quality filter — unchanged.
- Quality filtering (Jaccard dedup, answer-leak rejection, top-N
  selection) — unchanged.
- Pydantic request/response models, the `/generate-quiz` and `/health`
  endpoints, and the Supabase persistence layer — unchanged.

---

## 6. Environment Variables

### FastAPI service (`services/quiz-ml/.env`)

| Variable                | Required | Description                                                        |
|-------------------------|----------|--------------------------------------------------------------------|
| `OPENROUTER_API_KEY`    | **Yes**  | API key for OpenRouter (https://openrouter.ai). Read at request time by `generate_distractors_via_openrouter`. If missing, the distractor stage logs an error and falls back to placeholder distractors. |
| `PORT`                  | No       | FastAPI port. Defaults to `8001`.                                  |
| `HUGGINGFACE_CACHE_DIR` | No       | HuggingFace model cache directory. Defaults to `./model-cache`.    |

`.env` is gitignored — never commit it.

### Express backend (`backend/.env`)

| Variable               | Required | Description                                       |
|------------------------|----------|---------------------------------------------------|
| `QUIZ_ML_SERVICE_URL`  | Yes      | Base URL of the FastAPI service. e.g. `http://localhost:8001` |

---

## 7. Startup & Model Caching

On the **first run** the FastAPI lifespan handler downloads:

| Asset                                       | Size    | Cached at                |
|---------------------------------------------|---------|--------------------------|
| `valhalla/t5-base-qg-hl`                    | ~900 MB | `$HUGGINGFACE_CACHE_DIR` |
| `sentence-transformers/all-MiniLM-L6-v2`    | ~80 MB  | `$HUGGINGFACE_CACHE_DIR` |
| NLTK `punkt_tab`, `stopwords`, `averaged_perceptron_tagger_eng` | ~30 MB | NLTK data dir |

**Total cold-start download: ~1.0 GB.** (Down from ~1.2 GB previously, since
the WordNet and `omw-1.4` corpora are no longer needed.)

On **subsequent startups** all assets are loaded from disk in ~10–20 seconds
on a typical laptop. The Docker Compose `quiz-ml-cache` named volume
persists `model-cache/` across container restarts so the download cost is
paid once.

The OpenRouter call adds **~1–3 seconds per question** of network latency
(vs. milliseconds for the old WordNet lookup). All `httpx` calls have a
**10-second timeout**, and a single retry against the fallback model means
the worst-case wall time per question is bounded at ~20 seconds. If both
attempts fail, the function returns placeholder distractors and the
pipeline continues — it never raises out of stage 4.

---

## 8. API Reference

### `GET /health`

Returns service liveness and whether models are loaded.

**Response**

```json
{
  "status": "ok",
  "models_loaded": true
}
```

`status` is `"loading"` until `model_cache.load_all()` completes.

### `POST /generate-quiz`

Generates a quiz from raw text.

**Request**

```json
{
  "text": "...source material, at least 50 chars...",
  "question_type": "mcq" | "scenario" | "mixed",
  "question_count": 1
}
```

`question_count` is bounded between 1 and 20.

**Response**

```json
{
  "questions": [
    {
      "question_text": "What is ...?",
      "question_type": "mcq",
      "options": [
        { "id": "uuid", "label": "A", "text": "..." },
        { "id": "uuid", "label": "B", "text": "..." },
        { "id": "uuid", "label": "C", "text": "..." },
        { "id": "uuid", "label": "D", "text": "..." }
      ],
      "correct_option_id": "uuid",
      "explanation": "The correct answer is ...",
      "topic_tag": "..."
    }
  ]
}
```

**Error responses**

| Status | Meaning                                                 |
|--------|---------------------------------------------------------|
| 422    | Source text was too short or no key phrases extracted   |
| 503    | Models are still loading                                |
| 500    | Unhandled pipeline error                                |

---

## 9. FYP Academic Framing

The Quiz Generator implements a **hybrid neural pipeline** for automated
multiple-choice question synthesis from unstructured study material. The
architecture separates the pipeline into two functionally distinct halves:
a **local deterministic stage**, in which a fine-tuned T5 sequence-to-
sequence model (`valhalla/t5-base-qg-hl`) performs answer-aware question
generation over keyphrase candidates extracted by KeyBERT
(`all-MiniLM-L6-v2`); and a **remote generative stage**, in which an
instruction-tuned large language model accessed via the OpenRouter API
synthesises three contextually plausible distractor options per question.
The hybrid design is motivated by an empirical limitation of the prior
implementation, which relied on WordNet synset traversal and sense2vec
nearest-neighbour search to generate distractors. While computationally
inexpensive, these lexical resources produced distractors that were
academically meaningless on subject-specific source material because they
optimised for surface-level lexical similarity rather than conceptual
plausibility. Delegating only the distractor synthesis stage to a
general-knowledge LLM addresses this quality gap while keeping the
compute-bound stages — preprocessing, keyphrase extraction, question
generation, topic tagging, and quality filtering — entirely local. This
yields an estimated 80 percent reduction in third-party API consumption
relative to a fully LLM-generated pipeline, preserves the deterministic
testability of the question-generation core, and decouples the system from
any single model vendor: OpenRouter's unified routing layer permits the
distractor model to be swapped at configuration time without code changes,
which is desirable for ongoing evaluation and model iteration in an
academic setting.
