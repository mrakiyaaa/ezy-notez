"""
Core NLP pipeline for quiz question generation.

Pipeline stages (in execution order):
  1. Preprocessing  — sentence segmentation, cleaning, 512-token chunking
  2. Answer extraction — KeyBERT keyphrases per chunk
  3. Question generation — valhalla/t5-base-qg-hl with highlighted answer
  4. Distractor generation — OpenRouter LLM (mistralai/mistral-7b-instruct,
       google/gemma-2-9b-it fallback)
  5. Topic tagging — KeyBERT top keyword per question
  6. Quality filtering — dedup, confidence ranking, return exactly question_count
"""

import json
import logging
import os
import random
import re
import uuid
from typing import Literal

import httpx
import torch
from nltk.tokenize import sent_tokenize

import model_cache
from models import GeneratedQuestion, QuestionOption

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OpenRouter configuration (Stage 4)
# ---------------------------------------------------------------------------

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_PRIMARY_MODEL = "mistralai/mistral-7b-instruct"
OPENROUTER_FALLBACK_MODEL = "google/gemma-2-9b-it"
OPENROUTER_HTTP_REFERER = "https://ezynotez.com"
OPENROUTER_APP_TITLE = "EZY Notez"
OPENROUTER_TIMEOUT_SECONDS = 10.0
OPENROUTER_TEMPERATURE = 0.7

DISTRACTOR_COUNT = 3
PLACEHOLDER_DISTRACTORS: list[str] = [
    "None of the above",
    "All of the above",
    "Cannot be determined from the given information",
]


# ---------------------------------------------------------------------------
# Stage 1 — Preprocessing
# ---------------------------------------------------------------------------

def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = text.replace("\x00", "")
    return text.strip()


def _chunk_sentences(sentences: list[str], max_tokens: int = 512) -> list[str]:
    """Group sentences into chunks that fit within max_tokens (T5 tokenizer)."""
    tokenizer = model_cache.get_t5_tokenizer()
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sent in sentences:
        sent_len = len(tokenizer.encode(sent, add_special_tokens=False))
        if current_len + sent_len > max_tokens and current:
            chunks.append(" ".join(current))
            current = [sent]
            current_len = sent_len
        else:
            current.append(sent)
            current_len += sent_len

    if current:
        chunks.append(" ".join(current))

    return chunks


def preprocess(text: str) -> list[str]:
    """Return list of text chunks, each fitting within 512 tokens."""
    cleaned = _clean_text(text)
    sentences = sent_tokenize(cleaned)
    sentences = [s for s in sentences if len(s.split()) >= 5]
    return _chunk_sentences(sentences)


# ---------------------------------------------------------------------------
# Stage 2 — Answer Extraction
# ---------------------------------------------------------------------------

def extract_answers(chunks: list[str], answers_per_chunk: int = 3) -> list[tuple[str, str]]:
    """
    Return list of (chunk, answer_phrase) pairs.
    KeyBERT extracts top keyphrases; each becomes a candidate answer.
    """
    kb = model_cache.get_keybert()
    pairs: list[tuple[str, str]] = []

    for chunk in chunks:
        if len(chunk.split()) < 10:
            continue
        try:
            keywords = kb.extract_keywords(
                chunk,
                keyphrase_ngram_range=(1, 3),
                stop_words="english",
                top_n=answers_per_chunk,
                use_maxsum=True,
                nr_candidates=20,
            )
            for phrase, _score in keywords:
                if phrase and len(phrase.split()) <= 4:
                    pairs.append((chunk, phrase))
        except Exception as e:
            logger.warning(f"KeyBERT extraction failed for chunk: {e}")

    return pairs


# ---------------------------------------------------------------------------
# Stage 3 — Question Generation
# ---------------------------------------------------------------------------

def _highlight_answer(chunk: str, answer: str) -> str:
    """Wrap the answer in the chunk with <hl> tags for valhalla/t5-base-qg-hl."""
    highlighted = re.sub(
        re.escape(answer),
        f"<hl> {answer} <hl>",
        chunk,
        count=1,
        flags=re.IGNORECASE,
    )
    return f"generate question: {highlighted}"


def generate_questions_batch(
    pairs: list[tuple[str, str]],
    batch_size: int = 4,
) -> list[tuple[str, str, str]]:
    """
    Generate questions for (chunk, answer) pairs.
    Returns list of (question_text, answer, source_chunk).
    """
    tokenizer = model_cache.get_t5_tokenizer()
    model = model_cache.get_t5_model()
    results: list[tuple[str, str, str]] = []

    for i in range(0, len(pairs), batch_size):
        batch = pairs[i : i + batch_size]
        inputs_text = [_highlight_answer(chunk, ans) for chunk, ans in batch]

        encoding = tokenizer(
            inputs_text,
            max_length=512,
            padding=True,
            truncation=True,
            return_tensors="pt",
        )

        with torch.no_grad():
            outputs = model.generate(
                input_ids=encoding["input_ids"],
                attention_mask=encoding["attention_mask"],
                num_beams=2,
                max_length=64,
                early_stopping=True,
            )

        for j, output in enumerate(outputs):
            question = tokenizer.decode(output, skip_special_tokens=True).strip()
            if question and question.endswith("?"):
                chunk, answer = batch[j]
                results.append((question, answer, chunk))

    return results


# ---------------------------------------------------------------------------
# Stage 4 — Distractor Generation (OpenRouter LLM)
# ---------------------------------------------------------------------------

def _extract_source_context(chunk: str, answer: str, max_sentences: int = 2) -> str:
    """
    Return 1-2 sentences from the chunk to anchor the distractor prompt.
    Prefers the sentence containing the answer; otherwise the first sentences.
    """
    sentences = sent_tokenize(chunk)
    if not sentences:
        return chunk[:300]

    answer_lower = answer.lower()
    for i, sent in enumerate(sentences):
        if answer_lower in sent.lower():
            end = min(i + max_sentences, len(sentences))
            return " ".join(sentences[i:end])

    return " ".join(sentences[:max_sentences])


def _build_distractor_prompt(
    question_text: str,
    correct_answer: str,
    source_context: str,
) -> str:
    return (
        "You are generating multiple-choice distractors for an academic quiz.\n\n"
        f"Question: {question_text}\n"
        f"Correct answer: {correct_answer}\n"
        f"Source context: {source_context}\n\n"
        "Task: produce exactly 3 short, academically plausible but INCORRECT "
        "answer options for the question above. Each distractor must be a "
        "concise phrase (a few words), topically related to the source "
        "context, and clearly distinct from the correct answer.\n\n"
        "Output rules:\n"
        '- Return ONLY a valid JSON array of exactly 3 strings, e.g. ["foo", "bar", "baz"]\n'
        "- No explanation, no preamble, no markdown fences, no keys or labels "
        "— raw JSON array only."
    )


def _strip_markdown_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_distractor_payload(raw_content: str, model: str) -> list[str] | None:
    """Parse an OpenRouter message payload into exactly DISTRACTOR_COUNT strings."""
    cleaned = _strip_markdown_fences(raw_content)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(
            f"OpenRouter JSON parse failed (model={model}): {e} | raw={raw_content[:300]!r}"
        )
        return None

    if not isinstance(parsed, list):
        logger.error(
            f"OpenRouter returned non-array payload (model={model}): {parsed!r}"
        )
        return None

    distractors = [str(item).strip() for item in parsed if item is not None]
    distractors = [d for d in distractors if d]

    if len(distractors) != DISTRACTOR_COUNT:
        logger.error(
            f"OpenRouter returned {len(distractors)} distractors, expected "
            f"{DISTRACTOR_COUNT} (model={model}): {parsed!r}"
        )
        return None

    return distractors


async def _call_openrouter_model(
    client: httpx.AsyncClient,
    model: str,
    prompt: str,
) -> list[str] | None:
    """Single OpenRouter chat-completions call. Returns parsed distractors or None."""
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        logger.error("OPENROUTER_API_KEY is not set; cannot call OpenRouter.")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": OPENROUTER_HTTP_REFERER,
        "X-Title": OPENROUTER_APP_TITLE,
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": OPENROUTER_TEMPERATURE,
    }

    try:
        response = await client.post(
            OPENROUTER_API_URL,
            json=payload,
            headers=headers,
            timeout=OPENROUTER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        body = e.response.text[:300] if e.response is not None else ""
        logger.error(
            f"OpenRouter HTTP error (model={model}): {e} | body={body!r}"
        )
        return None
    except httpx.HTTPError as e:
        logger.error(f"OpenRouter transport error (model={model}): {e}")
        return None

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        logger.error(
            f"OpenRouter response shape invalid (model={model}): {e} | "
            f"raw={response.text[:300]!r}"
        )
        return None

    return _parse_distractor_payload(content, model)


async def generate_distractors_via_openrouter(
    question_text: str,
    correct_answer: str,
    source_context: str,
) -> list[str]:
    """
    Call OpenRouter to synthesise exactly 3 academically plausible distractors.

    Never raises. Tries the primary model first; on parse failure or transport
    error, retries once with the fallback model. On double failure, returns
    3 generic placeholder distractors so the pipeline never crashes.
    """
    prompt = _build_distractor_prompt(question_text, correct_answer, source_context)

    try:
        async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT_SECONDS) as client:
            distractors = await _call_openrouter_model(
                client, OPENROUTER_PRIMARY_MODEL, prompt
            )
            if distractors is None:
                logger.warning(
                    f"Primary model '{OPENROUTER_PRIMARY_MODEL}' failed — "
                    f"retrying with fallback '{OPENROUTER_FALLBACK_MODEL}'"
                )
                distractors = await _call_openrouter_model(
                    client, OPENROUTER_FALLBACK_MODEL, prompt
                )
    except Exception as e:
        logger.error(f"OpenRouter client raised unexpectedly: {e}")
        distractors = None

    if distractors is None:
        logger.warning(
            "All OpenRouter attempts failed — returning placeholder distractors."
        )
        return list(PLACEHOLDER_DISTRACTORS)

    return distractors


async def build_options(
    question_text: str,
    answer: str,
    chunk: str,
) -> tuple[list[QuestionOption], str]:
    """
    Build 4 QuestionOption objects (correct + 3 distractors) and return them
    together with the id of the correct option. Distractors come from the
    OpenRouter LLM.
    """
    source_context = _extract_source_context(chunk, answer)
    distractors = await generate_distractors_via_openrouter(
        question_text=question_text,
        correct_answer=answer,
        source_context=source_context,
    )

    # Defensive: ensure exactly 3 unique, non-empty distractors distinct from the
    # correct answer. In practice generate_distractors_via_openrouter already
    # guarantees this, but the pipeline must remain crash-free.
    seen: set[str] = {answer.lower()}
    unique_distractors: list[str] = []
    for d in distractors:
        key = d.lower()
        if key and key not in seen:
            unique_distractors.append(d)
            seen.add(key)

    for fb in PLACEHOLDER_DISTRACTORS:
        if len(unique_distractors) >= DISTRACTOR_COUNT:
            break
        if fb.lower() not in seen:
            unique_distractors.append(fb)
            seen.add(fb.lower())

    unique_distractors = unique_distractors[:DISTRACTOR_COUNT]

    correct_id = str(uuid.uuid4())
    pool = [(correct_id, answer)] + [
        (str(uuid.uuid4()), d) for d in unique_distractors
    ]
    random.shuffle(pool)

    labels = ["A", "B", "C", "D"]
    options = [
        QuestionOption(id=opt_id, label=labels[idx], text=text)
        for idx, (opt_id, text) in enumerate(pool)
    ]
    return options, correct_id


# ---------------------------------------------------------------------------
# Stage 5 — Topic Tagging
# ---------------------------------------------------------------------------

def extract_topic_tag(chunk: str) -> str:
    """Extract a 1-3 word topic tag from a chunk via KeyBERT."""
    kb = model_cache.get_keybert()
    try:
        keywords = kb.extract_keywords(
            chunk,
            keyphrase_ngram_range=(1, 3),
            stop_words="english",
            top_n=1,
        )
        if keywords:
            return keywords[0][0].title()
    except Exception:
        pass
    return "General"


# ---------------------------------------------------------------------------
# Stage 6 — Quality Filtering
# ---------------------------------------------------------------------------

def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.lower().split()), set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _answer_in_question(question: str, answer: str) -> bool:
    return answer.lower() in question.lower()


def filter_and_rank(
    candidates: list[tuple[str, str, str]],  # (question, answer, chunk)
    question_count: int,
) -> list[tuple[str, str, str]]:
    """
    Remove low-quality questions, deduplicate, return up to question_count.
    """
    # Remove questions where answer is trivially in the question text
    filtered = [
        (q, a, c) for q, a, c in candidates
        if not _answer_in_question(q, a)
    ]

    # Deduplicate by Jaccard similarity
    unique: list[tuple[str, str, str]] = []
    for item in filtered:
        if all(_jaccard(item[0], u[0]) < 0.7 for u in unique):
            unique.append(item)

    return unique[:question_count]


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def run_pipeline(
    text: str,
    question_type: Literal["mcq", "scenario", "mixed"],
    question_count: int,
) -> list[GeneratedQuestion]:
    """
    Execute the full NLP pipeline and return generated questions.
    Async because Stage 4 (distractor generation) awaits OpenRouter.
    """
    logger.info(f"Pipeline start: type={question_type}, count={question_count}")

    # Stage 1
    chunks = preprocess(text)
    if not chunks:
        raise ValueError("Text is too short to generate questions from.")
    logger.info(f"Preprocessed into {len(chunks)} chunks")

    # Stage 2 — extract more candidates than needed (over-generate by 2x)
    target_candidates = question_count * 2
    answers_per_chunk = max(2, target_candidates // len(chunks) + 1)
    pairs = extract_answers(chunks, answers_per_chunk=answers_per_chunk)
    logger.info(f"Extracted {len(pairs)} (chunk, answer) pairs")

    if not pairs:
        raise ValueError("Could not extract key phrases from the provided text.")

    # Stage 3
    raw_questions = generate_questions_batch(pairs, batch_size=4)
    logger.info(f"Generated {len(raw_questions)} raw questions")

    # Stage 6 — filter early to avoid unnecessary distractor calls
    filtered = filter_and_rank(raw_questions, question_count=target_candidates)

    # Stages 4 + 5 — build options (OpenRouter) and topic tags
    questions: list[GeneratedQuestion] = []
    for i, (question_text, answer, chunk) in enumerate(filtered):
        if len(questions) >= question_count:
            break

        try:
            options, correct_option_id = await build_options(
                question_text, answer, chunk
            )
            topic_tag = extract_topic_tag(chunk)

            # Determine per-question type for mixed mode
            if question_type == "mixed":
                q_type: Literal["mcq", "scenario"] = "scenario" if i % 3 == 0 else "mcq"
            elif question_type == "scenario":
                q_type = "scenario"
            else:
                q_type = "mcq"

            # For scenario questions, prefix question with a situational frame
            display_question = question_text
            if q_type == "scenario":
                context_sentences = sent_tokenize(chunk)
                context = context_sentences[0] if context_sentences else ""
                if context and context.lower() not in question_text.lower():
                    display_question = f"Consider the following: {context}\n\n{question_text}"

            explanation = (
                f'The correct answer is "{answer}". '
                f"This relates to the topic of {topic_tag}."
            )

            questions.append(
                GeneratedQuestion(
                    question_text=display_question,
                    question_type=q_type,
                    options=options,
                    correct_option_id=correct_option_id,
                    explanation=explanation,
                    topic_tag=topic_tag,
                )
            )
        except Exception as e:
            logger.warning(f"Skipping question due to error: {e}")

    if not questions:
        raise ValueError("Pipeline could not produce any valid questions. Try adding more resources.")

    logger.info(f"Pipeline complete: returned {len(questions)} questions")
    return questions
