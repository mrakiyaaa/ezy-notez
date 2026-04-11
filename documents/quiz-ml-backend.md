# Quiz Generator ML Backend

## 1. Overview

The EZY Notez Quiz Generator ML service is a lightweight **FastAPI microservice** (port 8001) that accepts raw study-material text and returns fully formed multiple-choice questions. It carries no local ML models: all question generation is delegated to an instruction-tuned large language model via the **OpenRouter API** (`meta-llama/llama-3.1-8b-instruct`). The service is stateless and starts instantly — there is no model download, no warm-up period, and no GPU requirement.

The local pipeline is confined to three responsibilities:

- **Stage 1 — Preprocessing:** NLTK sentence segmentation, rule-based extraction noise removal, context sanitisation, and character-limit capping before the text is sent to the LLM.
- **Stage 3 — Response parsing and validation:** Decoding the LLM's JSON output, resolving the correct option ID via a multi-strategy matcher, and discarding malformed items.
- **Stage 4 — Quality filtering:** Applying a rule-based quality gate (`is_valid_question`) and Jaccard-similarity deduplication to select the best `question_count` questions from the LLM's output.

The Express backend (`backend/src/services/quiz.service.ts`) orchestrates HTTP traffic: it inserts a quiz record into Supabase with status `pending`, fires the FastAPI service asynchronously, and updates the record to `ready` or `failed` when the pipeline completes.

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
┌──────────────────────────────────────────────────────────────────┐
│  FastAPI ML Service  (services/quiz-ml/, port 8001)              │
│                                                                  │
│  Input: raw text  +  question_type  +  question_count            │
│                                                                  │
│  ┌──────────────────── LOCAL ──────────────────────────────┐     │
│  │  Stage 1 — Preprocessing                                │     │
│  │    clean_extracted_text  (Layer 1 line filters)         │     │
│  │    NLTK sent_tokenize  →  drop fragments < 5 words      │     │
│  │    sanitize_context  (Layer 2 token scrubbers)          │     │
│  │    Truncate to 3 000 chars on sentence boundary         │     │
│  └─────────────────────────┬───────────────────────────────┘     │
│                            │  cleaned_text (≤ 3 000 chars)       │
│                            ▼                                     │
│  ┌──────────────── REMOTE (OpenRouter API) ────────────────┐     │
│  │  Stage 2 — Full Quiz Generation                         │     │
│  │    POST openrouter.ai/api/v1/chat/completions           │     │
│  │    Model: meta-llama/llama-3.1-8b-instruct              │     │
│  │    Returns: JSON array — questions + options +          │     │
│  │             correct_index + explanation + topic_tag     │     │
│  │    Timeout: 30 s  |  Retry at temperature 0.9           │     │
│  └─────────────────────────┬───────────────────────────────┘     │
│                            │  raw JSON string                    │
│                            ▼                                     │
│  ┌──────────────────── LOCAL ──────────────────────────────┐     │
│  │  Stage 3 — Response Parsing & Validation                │     │
│  │    Strip markdown fences, extract JSON array            │     │
│  │    Validate each item (shape, option count, types)      │     │
│  │    Resolve correct_option_id (int → label → text)       │     │
│  │    Assign fresh UUIDs + A/B/C/D labels                  │     │
│  └─────────────────────────┬───────────────────────────────┘     │
│                            │  list[GeneratedQuestion]            │
│                            ▼                                     │
│  ┌──────────────────── LOCAL ──────────────────────────────┐     │
│  │  Stage 4 — Quality Filtering                            │     │
│  │    is_valid_question gate (word count, headers, dups)   │     │
│  │    Jaccard deduplication (threshold 0.7)                │     │
│  │    Top-N selection (≤ question_count)                   │     │
│  └─────────────────────────┬───────────────────────────────┘     │
│                            │                                     │
│  Output: GeneratedQuestion[]                                     │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              Supabase (quizzes, quiz_questions, quiz_attempts)
```

---

## 3. Pipeline Stages

### Stage 1 — Preprocessing (Local)

The goal is to produce a clean, compact text representation of the source material before it is included in the LLM prompt.

**`clean_extracted_text` (Layer 1 — line-level filters)**

Applied first to the raw text received from the backend. Each line is independently evaluated and dropped if any of the following conditions are met:

| Rule | Rationale |
|---|---|
| Line length < 30 characters | Removes slide-title fragments and stray labels |
| Contains a file-extension pattern (`.pptx`, `.pdf`, `.docx`, etc.) | Removes filename artefacts from PPTX extraction |
| Contains `\\` or `://` | Removes Windows paths and URLs |
| All-uppercase line | Removes PPTX slide headers rendered in caps |
| Matches `^[A-Z][a-z]+( [A-Z][a-z]+){0,2}$` | Removes presenter credit / name-only lines |
| Matches agenda or learning-outcome header patterns | Removes lecture scaffolding noise |
| Matches rhetorical header patterns (`"What are the…"`, `"What will we…"`) | Removes template slide language |
| Matches `^\s*(\w+\s+){0,4}\w+\s*:\s*$` (≤ 5 words ending with colon) | Removes bullet-dump section headers |
| All comma-separated items with ≤ 2 words each | Removes slide bullet dumps |
| Any word repeated more than twice | Removes repeated-token noise |

Non-printable control characters are stripped and intra-line whitespace is collapsed before these checks run. If more than 40% of the input text is removed, a warning is logged.

**`sanitize_context` (Layer 2 — token-level scrubbers)**

Applied to the joined sentence output before truncation. Replaces via regex:

- HTTP/HTTPS URLs
- Windows filesystem paths (`C:\...`)
- Filename tokens (any token ending in a known extension)
- Person name patterns (2–3 capitalised words)
- Lecture noise tokens (`slide 4`, `lecture 2`, `figure 12`, etc.)

Falls back to a generic stub (`"This question is based on academic course material."`) if nothing meaningful remains after scrubbing.

**NLTK segmentation and truncation**

`sent_tokenize` (NLTK `punkt_tab`) splits the cleaned text into sentences. Sentences shorter than 5 words are discarded. The remaining sentences are joined and the result is truncated to **3 000 characters** on the nearest sentence boundary (preferring `.` followed by space, falling back to the last word boundary).

---

### Stage 2 — OpenRouter Full Generation (Remote)

A single `POST` request to the OpenRouter chat-completions endpoint instructs the LLM to generate the entire quiz in one shot.

**Endpoint and model**

| Parameter | Value |
|---|---|
| URL | `https://openrouter.ai/api/v1/chat/completions` |
| Model | `meta-llama/llama-3.1-8b-instruct` |
| `HTTP-Referer` header | `https://ezynotez.com` |
| `X-Title` header | `EZY Notez` |
| `Authorization` header | `Bearer <OPENROUTER_API_KEY>` |
| Temperature (first attempt) | `0.7` |
| Temperature (retry) | `0.9` |
| Timeout | 30 seconds |

**Prompt structure**

The prompt instructs the model to generate strictly from the source text and to return a raw JSON array with no prose or markdown fences. The `question_type` parameter controls per-question type instructions:

- `mcq` — all questions are direct factual MCQs
- `scenario` — all questions are framed as situational scenarios
- `mixed` — roughly half of each

The model is asked to produce `max(question_count + 2, floor(question_count × 1.5))` questions (over-generation) to give the quality filter room to drop weak items without falling below the user's requested count.

**Expected JSON schema per item**

```json
{
  "question_text": "string",
  "question_type": "mcq" | "scenario",
  "options": ["string", "string", "string", "string"],
  "correct_index": 0 | 1 | 2 | 3,
  "explanation": "string",
  "topic_tag": "string"
}
```

**Retry logic**

If Stage 3 produces fewer valid questions than `question_count` after the first call, a second OpenRouter call is made with temperature raised to `0.9`. Results from both calls are pooled before Stage 4 runs. If the transport or HTTP layer fails on either attempt, the call returns `None` and the pipeline raises a `ValueError` with a user-facing message.

---

### Stage 3 — Response Parsing & Validation (Local)

**`parse_and_validate_questions`** processes the raw string returned by OpenRouter.

**Pre-parsing**

Markdown code fences (` ```json ` … ` ``` `) are stripped. The first top-level JSON array is extracted by scanning for the outermost `[` … `]` pair, which tolerates preamble text that the model sometimes emits before the array.

**Per-item validation**

Each item in the decoded array is checked in order. Items that fail any check are discarded with a warning log:

1. Item must be a `dict`.
2. `question_text` must be a non-empty string.
3. `options` must be a list of exactly 4 non-empty strings.
4. `correct_index` must resolve to a valid option (see below).
5. `question_type` must be `"mcq"` or `"scenario"`; defaults to `"mcq"` if absent or unrecognised.

**`correct_index` resolution (three strategies)**

Because instruction-tuned models do not always return an integer index, the resolver applies three strategies in sequence:

| Strategy | Handles |
|---|---|
| 1 — Integer index | `correct_index: 2` (normal case) |
| 2 — Letter label or stringified integer | `"B"`, `"b"`, `"0"`, `"3"` (LLM returns a label or digit string) |
| 3 — Text match | The raw value matched case-insensitively (stripped) against each option's text (LLM returns the answer text instead of an index) |

If all three strategies fail, the item is discarded with a warning that includes the raw `correct_index` value and the available option texts.

**ID assignment**

After a valid `correct_index` is resolved, four `QuestionOption` objects are created with fresh UUIDs and labels `A`, `B`, `C`, `D` in the order the LLM returned them. `correct_option_id` is set to the UUID of `options[resolved_index]`. Because the UUID is assigned after validation, the mapping between `correct_option_id` and the correct option text is guaranteed by construction — there is no shuffle step and no post-hoc lookup. Every accepted question logs its `correct_option_id` (first 8 characters), label, and option text for verification.

---

### Stage 4 — Quality Filtering (Local)

**`is_valid_question` gate**

Each candidate `GeneratedQuestion` is passed through a rule-based gate:

| Check | Rule |
|---|---|
| Slide-header phrase | Rejected if `question_text` matches patterns such as `"What are the learning objectives…"` |
| Minimum word count | Rejected if `question_text` has fewer than 8 words |
| Embedded question marks | Rejected if `question_text` contains more than one `?` (malformed compound question) |
| Distractor count | Rejected if the options list does not yield exactly 3 non-correct options |
| Distractor deduplication | Rejected if any two distractors are identical (case-insensitive) |
| Minimum distractor length | Rejected if any distractor is empty |

**Jaccard deduplication**

Questions that pass the gate are added to the output list only if their Jaccard word-set similarity with every already-accepted question is below **0.7**. This prevents near-identical questions generated from similar source passages from appearing in the same quiz.

**Top-N selection**

The filter returns at most `question_count` questions in the order they passed the gate. If no question survives, the pipeline raises `ValueError("Pipeline could not produce any valid questions. Try adding more resources.")`.

---

## 4. Evolution of the Pipeline — Old vs New

### 4.1 Original Implementation (Local T5 Pipeline)

The initial implementation was a fully local 6-stage pipeline with no external API dependency:

1. **Preprocessing** — NLTK sentence segmentation, T5-tokeniser-based 512-token chunking
2. **Answer extraction** — KeyBERT (`all-MiniLM-L6-v2`) extracted keyphrase candidates per chunk via MaxSum diversification
3. **Question generation** — `valhalla/t5-base-qg-hl` generated one question per `(chunk, answer)` pair using `<hl>` highlight tags, `num_beams=2`, `torch.no_grad()`, batch size 4
4. **Distractor generation** — WordNet synset traversal with a KeyBERT nearest-neighbour fallback, padded with placeholder strings if fewer than 3 candidates survived
5. **Topic tagging** — KeyBERT top keyword per chunk
6. **Quality filtering** — Jaccard deduplication, answer-leak rejection

**Dependencies:** `transformers`, `torch`, `keybert`, `sentence-transformers`, `nltk` (including `wordnet` and `omw-1.4` corpora). Cold-start download was approximately 1 GB; subsequent startup took 10–30 seconds on CPU.

**Problems encountered during testing:**

- **Meaningless distractors.** WordNet hyponym traversal is lexical, not semantic. For subject-specific answers such as `"backpropagation"` or `"clustering"`, it returned sibling hyponyms of generic English nouns that bore no subject relevance — options students could eliminate without reading the question.
- **Zero question variety.** KeyBERT is deterministic. The same source text always yielded the same keyphrase set, which T5 translated into the same questions on every run. Re-generating a quiz from the same resources produced identical output.
- **`correct_id` mapping bug.** The T5-generated correct answer (a keyphrase string) was placed in the options list alongside three LLM-generated distractors, then the list was shuffled with `random.shuffle`. A post-shuffle ID lookup was attempted via string equality, but the KeyBERT phrase and the assembled option text often diverged due to normalisation differences, causing `correct_option_id` to point at the wrong option or raise a `ValueError`.
- **Slide-header contamination.** KeyBERT extracted phrases from slide-title and agenda lines (`"Learning outcomes"`, `"Today's objectives"`), which T5 then turned into nonsensical or meta-level questions.
- **T5-base quality ceiling.** `t5-base` is a 220M-parameter model fine-tuned on SQuAD-style QA. Questions were frequently grammatically malformed, narrowly phrased, or directly embedded the answer in the question stem.

### 4.2 Intermediate Hybrid Implementation

To address distractor quality without replacing the entire pipeline, an intermediate version retained T5 for question generation and substituted the WordNet/KeyBERT distractor stage with an OpenRouter LLM call:

- **Kept:** T5 question generation, KeyBERT answer extraction and topic tagging, all preprocessing, quality filtering
- **Replaced:** `_wordnet_distractors` and `_keybert_distractors` with `generate_distractors_via_openrouter` — a single OpenRouter call per question asking for exactly 3 plausible distractors given the question text, correct answer, and sanitised source context
- **Added:** `clean_extracted_text` (Layer 1 line filters) and `sanitize_context` (Layer 2 token scrubbers) to reduce extraction noise, `is_valid_question` quality gate

**Problems that persisted:**

- The `correct_id` bug was not resolved: it originated in the interaction between KeyBERT phrase normalisation and the option assembly step, which remained unchanged.
- Question variety was still zero because KeyBERT and T5 were still in use.
- Question quality was still limited by T5-base; distractor quality improved significantly but the questions themselves remained the weakest part of the output.
- Startup time remained at ~10–30 seconds due to T5 and KeyBERT model loading.

### 4.3 Current Implementation (Full OpenRouter Pipeline)

The current architecture replaces Stages 2–5 of the hybrid with a single OpenRouter call that produces the complete quiz — questions, options, correct index, explanations, and topic tags — in one structured generation step.

**What changed:**

- Stages 2 (KeyBERT answer extraction), 3 (T5 question generation), 4 (OpenRouter distractor generation), and 5 (KeyBERT topic tagging) were replaced by a single `generate_quiz_via_openrouter` call.
- `parse_and_validate_questions` was introduced to decode the LLM's JSON output and resolve `correct_option_id` with a three-strategy matcher (integer index → letter label → text match), eliminating the `correct_id` bug class entirely.
- All local ML dependencies (`torch`, `transformers`, `tokenizers`, `sentencepiece`, `protobuf`, `keybert`, `sentence-transformers`) were removed from `requirements.txt`.
- `model_cache.py` was deleted. The FastAPI lifespan handler now only ensures NLTK `punkt_tab` data is present.
- LLM temperature introduces natural variation: re-generating from the same source text produces different questions on each run.

### 4.4 Comparison Table

| Aspect | Local T5 Pipeline | Full OpenRouter Pipeline |
|---|---|---|
| Question quality | Limited by T5-base (220M params) | High — instruction-tuned LLM |
| Distractor quality | Meaningless (WordNet lexical) | Academically plausible |
| Question variety | Identical on every run (deterministic) | Varied per run (LLM temperature) |
| `correct_option_id` accuracy | Buggy — phrase normalisation mismatch | Correct by construction — UUID assigned at parse time |
| Local ML dependencies | `torch`, `transformers`, `keybert`, `sentence-transformers` | None |
| Startup time | ~10–30 s (model loading) | Instant (NLTK data check only) |
| Inference cost | Free (local CPU) | Free (OpenRouter free tier) |
| External API dependency | None | OpenRouter (`meta-llama/llama-3.1-8b-instruct`) |
| Cold-start download | ~1 GB | None |

---

## 5. API Reference

### `GET /health`

Returns service liveness. No model state is tracked — the service is ready as soon as the process is up.

**Response**

```json
{
  "status": "ok",
  "models_loaded": true
}
```

`models_loaded` is always `true` in the current implementation (no local models). It is retained for backwards compatibility with existing clients.

---

### `POST /generate-quiz`

Generates a quiz from raw text.

**Request body**

```json
{
  "text": "...source material, minimum 50 characters...",
  "question_type": "mcq" | "scenario" | "mixed",
  "question_count": 5
}
```

`question_count` is validated between 1 and 20 inclusive.

**Response body**

```json
{
  "questions": [
    {
      "question_text": "Which of the following best describes ...?",
      "question_type": "mcq",
      "options": [
        { "id": "3f8a1c2d-...", "label": "A", "text": "..." },
        { "id": "7b4e9f01-...", "label": "B", "text": "..." },
        { "id": "a2d6c850-...", "label": "C", "text": "..." },
        { "id": "f1e3b794-...", "label": "D", "text": "..." }
      ],
      "correct_option_id": "a2d6c850-...",
      "explanation": "The correct answer is '...'. This relates to the topic of ...",
      "topic_tag": "Neural Networks"
    }
  ]
}
```

**Error responses**

| HTTP Status | Condition |
|---|---|
| `422` | Text is empty after preprocessing, too short (< 20 words after cleaning), or the pipeline produced no valid questions |
| `500` | Unhandled pipeline error (logged server-side) |

The `503` status that was present in earlier versions (models still loading) no longer applies — there are no local models to load.

---

## 6. Environment Variables

### FastAPI service (`services/quiz-ml/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | **Yes** | — | API key for OpenRouter. Read at request time by `generate_quiz_via_openrouter`. If unset, Stage 2 logs an error and the pipeline raises a `ValueError`. |
| `PORT` | No | `8001` | Port that uvicorn binds to. |

`.env` is gitignored — never commit it.

### Express backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `QUIZ_ML_SERVICE_URL` | Yes | Base URL of the FastAPI service, e.g. `http://127.0.0.1:8001`. |

---

## 7. Startup & Running

There is no model download on first run. The service starts in under two seconds.

**Install dependencies (first time or after requirements change)**

```powershell
# From the project root
Remove-Item -Recurse -Force services\quiz-ml\venv
python -m venv services\quiz-ml\venv
services\quiz-ml\venv\Scripts\pip install -r services\quiz-ml\requirements.txt
```

**Run the ML service only**

```powershell
npm run dev:ml
```

**Run all three services together (recommended)**

```powershell
npm run dev
```

This uses `concurrently` to start the Express backend, Next.js frontend, and FastAPI ML service in a single terminal with colour-coded output.

**Expected startup log**

```
[QUIZ-ML] INFO:     Uvicorn running on http://127.0.0.1:8001
[QUIZ-ML] INFO:     Waiting for application startup.
[QUIZ-ML] INFO main: Starting up Quiz ML service — preparing NLTK data...
[QUIZ-ML] INFO main: NLTK data ready. Service is online.
[QUIZ-ML] INFO:     Application startup complete.
```

The service is ready immediately after `Application startup complete.` appears. No further warm-up is required.

---

## 8. FYP Academic Framing

The Quiz Generator component of EZY Notez underwent three iterative architectural revisions, each motivated by empirical evaluation of the preceding implementation's output quality. The initial design comprised a fully local six-stage pipeline in which a fine-tuned T5 sequence-to-sequence model (`valhalla/t5-base-qg-hl`) generated question stems from keyphrase candidates produced by KeyBERT, and distractors were synthesised via WordNet synset traversal. Systematic testing on subject-specific academic material revealed two fundamental limitations of this approach: the WordNet-based distractor stage generated lexically proximate but academically meaningless options, and the deterministic nature of KeyBERT extraction meant that re-generating a quiz from identical source material produced identical output on every run. An intermediate hybrid implementation retained T5 for question generation and replaced only the distractor stage with an OpenRouter LLM call, which improved distractor plausibility substantially; however, question quality remained constrained by the capacity of the 220M-parameter T5-base model, question variety remained zero, and a pre-existing `correct_option_id` mapping bug — caused by normalisation divergence between the KeyBERT extraction phrase and the assembled option text — was not resolved by this change. The final architecture delegates full quiz generation to `meta-llama/llama-3.1-8b-instruct` via a single structured OpenRouter call, retaining only text preprocessing and output quality filtering as local pipeline stages. This design decision was adopted following empirical evaluation that demonstrated the instruction-tuned LLM produced consistently higher-quality question stems, academically plausible distractors, and natural variation across runs. The `correct_option_id` mapping was fixed by construction: the correct option UUID is assigned at parse time by indexing directly into the assembled options list, eliminating the post-hoc string matching that caused the earlier bug. The architectural trade-off accepted in this decision is a dependency on the OpenRouter API for inference; this was deprioritised relative to assessment validity and output reliability given that OpenRouter provides a free tier sufficient for development and evaluation at the scale of a final-year project.
