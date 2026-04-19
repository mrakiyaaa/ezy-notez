"""
Quiz generation pipeline — OpenRouter LLM-driven.

Stages:
  1. Preprocessing            — clean extraction noise, NLTK sentence
                                segmentation, sanitize, cap to 3000 chars.
  2. OpenRouter Generation    — single chat-completion call to
                                meta-llama/llama-3.1-8b-instruct that produces
                                the entire quiz (questions + options +
                                correct index + explanation + topic tag) in
                                one shot.
  3. Response Parsing         — strip fences, JSON-decode, validate shape,
                                assign UUIDs and A/B/C/D labels, build
                                GeneratedQuestion objects.
  4. Quality Filtering        — quality gate (slide-header / word count /
                                duplicate distractors) + Jaccard dedup +
                                top-N selection.
"""

import json
import logging
import os
import re
import uuid
from typing import Literal

import httpx
from nltk.tokenize import sent_tokenize

from .models import GeneratedQuestion, QuestionOption

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct"
OPENROUTER_HTTP_REFERER = "https://ezynotez.com"
OPENROUTER_APP_TITLE = "EZY Notez"
OPENROUTER_TIMEOUT_SECONDS = 30.0
OPENROUTER_TEMPERATURE = 0.7
OPENROUTER_RETRY_TEMPERATURE = 0.9
MAX_CONTEXT_CHARS = 3000

MIN_LINE_LENGTH = 30
EXTRACTION_REMOVAL_WARNING_THRESHOLD = 0.4
DEFAULT_CONTEXT_FALLBACK = "This question is based on academic course material."

NON_PRINTABLE_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
INTRA_LINE_SPACE_PATTERN = re.compile(r"[ \t]+")
FILE_EXTENSION_PATTERN = re.compile(r"\.(?:pptx?|pdf|docx?|xlsx?|txt|csv)\b", re.IGNORECASE)
PATH_SEPARATOR_PATTERN = re.compile(r"[\\]|://")
NAME_LINE_PATTERN = re.compile(r"^[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}$")
AGENDA_LINE_PATTERN = re.compile(r"^(?:today'?s?\s+lesson|learning\s+outcomes?|objectives?|agenda|outline|overview|introduction\s+to|by\s+the\s+end\s+of|in\s+this\s+lecture|topics?\s+covered|what\s+we\s+will)", re.IGNORECASE)
RHETORICAL_HEADER_PATTERN = re.compile(r"^(?:what\s+are\s+the|what\s+is\s+the\s+purpose\s+of\s+this|what\s+will\s+we)", re.IGNORECASE)
COLON_END_PATTERN = re.compile(r"^\s*(?:\w+\s+){0,4}\w+\s*:\s*$")
BULLET_DUMP_MIN_ITEMS = 2
BULLET_DUMP_MAX_WORDS_PER_ITEM = 2
REPEATED_TOKEN_MAX_COUNT = 2

URL_TOKEN_PATTERN = re.compile(r"https?://\S+")
WINDOWS_PATH_TOKEN_PATTERN = re.compile(r"[A-Za-z]:\\[^\s]*")
FILENAME_TOKEN_PATTERN = re.compile(r"\S*\.(?:pptx?|pdf|docx?|xlsx?|txt|csv)\b", re.IGNORECASE)
NAME_TOKEN_PATTERN = re.compile(r"\b[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2}\b")
LECTURE_NOISE_PATTERN = re.compile(r"\b(?:slide|lecture|chapter|figure|table)\s*\d+\b", re.IGNORECASE)
ALL_WHITESPACE_PATTERN = re.compile(r"\s+")

MIN_QUESTION_WORDS = 8
MIN_DISTRACTOR_WORDS = 1
DISTRACTOR_COUNT = 3
EXPECTED_OPTION_COUNT = 4
DUPLICATE_JACCARD_THRESHOLD = 0.7
SLIDE_HEADER_QUESTION_PATTERN = re.compile(r"^(?:what\s+are\s+the\s+learning|what\s+is\s+today|what\s+will|what\s+are\s+the\s+objectives?|what\s+are\s+the\s+topics?)", re.IGNORECASE)


def _is_bullet_dump(line: str) -> bool:
    items = [item.strip() for item in line.split(",")]
    if len(items) < BULLET_DUMP_MIN_ITEMS:
        return False
    return all(len(item.split()) <= BULLET_DUMP_MAX_WORDS_PER_ITEM for item in items if item)


def _has_repeated_tokens(line: str) -> bool:
    words = line.lower().split()
    return any(words.count(w) > REPEATED_TOKEN_MAX_COUNT for w in set(words))


def clean_extracted_text(text: str) -> str:
    if not text:
        return ""

    original_length = len(text)
    stripped = NON_PRINTABLE_PATTERN.sub("", text)

    cleaned_lines: list[str] = []
    for raw_line in stripped.splitlines():
        line = INTRA_LINE_SPACE_PATTERN.sub(" ", raw_line).strip()
        if not line:
            continue
        if len(line) < MIN_LINE_LENGTH:
            continue
        if FILE_EXTENSION_PATTERN.search(line):
            continue
        if PATH_SEPARATOR_PATTERN.search(line):
            continue
        if line.isupper():
            continue
        if NAME_LINE_PATTERN.match(line):
            continue
        if AGENDA_LINE_PATTERN.match(line):
            continue
        if RHETORICAL_HEADER_PATTERN.match(line):
            continue
        if COLON_END_PATTERN.search(line):
            continue
        if _is_bullet_dump(line):
            continue
        if _has_repeated_tokens(line):
            continue
        cleaned_lines.append(line)

    result = "\n".join(cleaned_lines).strip()

    if original_length > 0:
        removed_ratio = 1.0 - (len(result) / original_length)
        if removed_ratio > EXTRACTION_REMOVAL_WARNING_THRESHOLD:
            logger.warning(
                f"clean_extracted_text removed {removed_ratio * 100:.1f}% of "
                f"input text ({original_length} → {len(result)} chars) — "
                f"possible extraction issue worth investigating"
            )

    return result


def sanitize_context(context: str) -> str:
    if not context:
        return DEFAULT_CONTEXT_FALLBACK

    cleaned = URL_TOKEN_PATTERN.sub(" ", context)
    cleaned = WINDOWS_PATH_TOKEN_PATTERN.sub(" ", cleaned)
    cleaned = FILENAME_TOKEN_PATTERN.sub(" ", cleaned)
    cleaned = NAME_TOKEN_PATTERN.sub(" ", cleaned)
    cleaned = LECTURE_NOISE_PATTERN.sub(" ", cleaned)
    cleaned = ALL_WHITESPACE_PATTERN.sub(" ", cleaned).strip()

    if not cleaned:
        return DEFAULT_CONTEXT_FALLBACK

    return cleaned


def _truncate_to_char_limit(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    truncated = text[:limit]
    last_period = truncated.rfind(". ")
    if last_period > limit * 0.6:
        return truncated[: last_period + 1]
    last_space = truncated.rfind(" ")
    if last_space > 0:
        return truncated[:last_space]
    return truncated


def preprocess(text: str) -> str:
    sentences = sent_tokenize(text)
    sentences = [s.strip() for s in sentences if len(s.split()) >= 5]
    if not sentences:
        return ""
    joined = " ".join(sentences)
    sanitized = sanitize_context(joined)
    return _truncate_to_char_limit(sanitized, MAX_CONTEXT_CHARS)


def _build_quiz_prompt(
    cleaned_text: str,
    question_type: Literal["mcq", "scenario", "mixed"],
    question_count: int,
) -> str:
    if question_type == "mixed":
        type_instruction = (
            f'Mix "mcq" and "scenario" question_type values across the '
            f'{question_count} questions (roughly half and half)'
        )
    elif question_type == "scenario":
        type_instruction = (
            'Every question_type must be "scenario". Phrase each question as '
            'a brief situational frame followed by the actual question'
        )
    else:
        type_instruction = (
            'Every question_type must be "mcq" — direct factual questions '
            'grounded in the source text'
        )

    return (
        "You are an expert academic quiz generator. Generate quiz questions "
        "STRICTLY from the SOURCE TEXT below — do not invent facts that are "
        "not supported by it.\n\n"
        f"SOURCE TEXT:\n{cleaned_text}\n\n"
        "TASK:\n"
        f"- Produce exactly {question_count} quiz questions.\n"
        f"- {type_instruction}.\n"
        "- Each question must have exactly 4 options (1 correct, 3 plausible "
        "but clearly incorrect distractors).\n"
        "- Distractors must be topically related to the source text and "
        "distinct from the correct answer.\n"
        "- Provide a 1-2 sentence explanation grounded in the source text.\n"
        "- Provide a short topic_tag (1-3 words).\n\n"
        "OUTPUT FORMAT — return ONLY a valid JSON array. No prose, no "
        "markdown fences, no preamble. Each element MUST match this schema "
        "exactly:\n"
        "{\n"
        '  "question_text": "string",\n'
        '  "question_type": "mcq" | "scenario",\n'
        '  "options": ["string", "string", "string", "string"],\n'
        '  "correct_index": 0 | 1 | 2 | 3,\n'
        '  "explanation": "string",\n'
        '  "topic_tag": "string"\n'
        "}\n\n"
        "Output the JSON array now."
    )


async def _post_to_openrouter(
    client: httpx.AsyncClient,
    prompt: str,
    temperature: float,
) -> str | None:
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        logger.error("[Stage 2] OPENROUTER_API_KEY is not set; cannot call OpenRouter.")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": OPENROUTER_HTTP_REFERER,
        "X-Title": OPENROUTER_APP_TITLE,
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
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
            f"[Stage 2] OpenRouter HTTP {e.response.status_code} error "
            f"(model={OPENROUTER_MODEL}, temp={temperature}) | body={body!r}"
        )
        return None
    except httpx.TimeoutException as e:
        logger.error(
            f"[Stage 2] OpenRouter request timed out after {OPENROUTER_TIMEOUT_SECONDS}s "
            f"(model={OPENROUTER_MODEL}, temp={temperature}): {e}"
        )
        return None
    except httpx.HTTPError as e:
        logger.error(
            f"[Stage 2] OpenRouter transport error (model={OPENROUTER_MODEL}, "
            f"temp={temperature}): {e}"
        )
        return None

    try:
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        logger.error(
            f"[Stage 2] OpenRouter response shape invalid: {e} | "
            f"raw={response.text[:300]!r}"
        )
        return None


async def generate_quiz_via_openrouter(
    cleaned_text: str,
    question_type: Literal["mcq", "scenario", "mixed"],
    question_count: int,
    temperature: float = OPENROUTER_TEMPERATURE,
) -> str | None:
    if len(cleaned_text) > MAX_CONTEXT_CHARS:
        cleaned_text = _truncate_to_char_limit(cleaned_text, MAX_CONTEXT_CHARS)

    prompt = _build_quiz_prompt(cleaned_text, question_type, question_count)

    try:
        async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT_SECONDS) as client:
            return await _post_to_openrouter(client, prompt, temperature)
    except Exception as e:
        logger.error(f"[Stage 2] OpenRouter client raised unexpectedly: {e}")
        return None


def _strip_markdown_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _extract_json_array(text: str) -> str:
    cleaned = _strip_markdown_fences(text)
    start = cleaned.find("[")
    end = cleaned.rfind("]")
    if start >= 0 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def parse_and_validate_questions(
    raw_response: str,
    question_count: int,
) -> list[GeneratedQuestion]:
    if not raw_response:
        logger.error("[Stage 3] Empty response from OpenRouter.")
        return []

    try:
        payload_text = _extract_json_array(raw_response)

        try:
            parsed = json.loads(payload_text)
        except json.JSONDecodeError as e:
            logger.error(
                f"[Stage 3] JSON parse failed: {e} | raw={raw_response[:500]!r}"
            )
            return []

        if not isinstance(parsed, list):
            logger.error(
                f"[Stage 3] Expected JSON array, got {type(parsed).__name__}: "
                f"{str(parsed)[:200]!r}"
            )
            return []

        questions: list[GeneratedQuestion] = []
        for idx, item in enumerate(parsed):
            if len(questions) >= question_count:
                break
            if not isinstance(item, dict):
                logger.warning(f"[Stage 3] Item {idx}: not a dict, skipping")
                continue

            question_text = (item.get("question_text") or "").strip()
            options_raw = item.get("options")
            correct_index = item.get("correct_index")
            explanation = (item.get("explanation") or "").strip()
            topic_tag = (item.get("topic_tag") or "General").strip() or "General"
            q_type_raw = (item.get("question_type") or "mcq").strip().lower()

            if q_type_raw not in ("mcq", "scenario"):
                q_type_raw = "mcq"

            if not question_text:
                logger.warning(f"[Stage 3] Item {idx}: missing question_text, skipping")
                continue
            if not isinstance(options_raw, list) or len(options_raw) != EXPECTED_OPTION_COUNT:
                actual = len(options_raw) if isinstance(options_raw, list) else type(options_raw).__name__
                logger.warning(
                    f"[Stage 3] Item {idx}: expected {EXPECTED_OPTION_COUNT} options, "
                    f"got {actual}; skipping"
                )
                continue
            option_texts = [str(o).strip() for o in options_raw]
            if any(not t for t in option_texts):
                logger.warning(f"[Stage 3] Item {idx}: empty option text, skipping")
                continue

            labels = ["A", "B", "C", "D"]
            options = [
                QuestionOption(id=str(uuid.uuid4()), label=labels[i], text=option_texts[i])
                for i in range(EXPECTED_OPTION_COUNT)
            ]

            _LABEL_TO_INDEX = {"a": 0, "b": 1, "c": 2, "d": 3}
            resolved_index: int | None = None

            if isinstance(correct_index, int) and 0 <= correct_index < EXPECTED_OPTION_COUNT:
                resolved_index = correct_index
            elif isinstance(correct_index, str):
                _ci = correct_index.strip().lower()
                if _ci in _LABEL_TO_INDEX:
                    resolved_index = _LABEL_TO_INDEX[_ci]
                elif _ci.isdigit() and 0 <= int(_ci) < EXPECTED_OPTION_COUNT:
                    resolved_index = int(_ci)

            if resolved_index is not None:
                correct_option_id = options[resolved_index].id
            else:
                _ci_text = str(correct_index).strip().lower() if correct_index is not None else ""
                _text_match = next(
                    (opt for opt in options if opt.text.strip().lower() == _ci_text),
                    None,
                )
                if _text_match:
                    correct_option_id = _text_match.id
                    logger.warning(
                        f"[Stage 3] Item {idx}: correct_index={correct_index!r} resolved "
                        f"by text match to option id={_text_match.id[:8]} "
                        f"text={_text_match.text!r}"
                    )
                else:
                    logger.warning(
                        f"[Stage 3] Item {idx}: cannot resolve correct_index={correct_index!r} "
                        f"to any option (tried int, label, text); skipping"
                    )
                    continue

            _confirmed = next((opt for opt in options if opt.id == correct_option_id), None)
            if _confirmed is None:
                logger.warning(
                    f"[Stage 3] Item {idx}: correct_option_id={correct_option_id!r} "
                    f"not found in assembled options after resolution; skipping"
                )
                continue
            logger.info(
                f"[Stage 3] Item {idx}: correct_option_id={correct_option_id[:8]} "
                f"label={_confirmed.label} text={_confirmed.text!r}"
            )

            if not explanation:
                explanation = (
                    f'The correct answer is "{_confirmed.text}". '
                    f"This relates to the topic of {topic_tag}."
                )

            questions.append(
                GeneratedQuestion(
                    question_text=question_text,
                    question_type=q_type_raw,  # type: ignore[arg-type]
                    options=options,
                    correct_option_id=correct_option_id,
                    explanation=explanation,
                    topic_tag=topic_tag,
                )
            )

        return questions

    except Exception as e:
        logger.error(
            f"[Stage 3] Unexpected error during response parsing: {e}", exc_info=True
        )
        return []


def is_valid_question(question: GeneratedQuestion) -> bool:
    qt = question.question_text
    if SLIDE_HEADER_QUESTION_PATTERN.match(qt):
        return False
    if len(qt.split()) < MIN_QUESTION_WORDS:
        return False
    if qt.rstrip().count("?") > 1:
        return False

    distractors = [
        opt.text for opt in question.options if opt.id != question.correct_option_id
    ]
    if len(distractors) != DISTRACTOR_COUNT:
        return False

    seen: set[str] = set()
    for d in distractors:
        words = d.lower().split()
        if len(words) < MIN_DISTRACTOR_WORDS:
            return False
        key = d.lower()
        if key in seen:
            return False
        seen.add(key)

    return True


def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.lower().split()), set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def filter_and_rank(
    questions: list[GeneratedQuestion],
    question_count: int,
) -> list[GeneratedQuestion]:
    try:
        valid: list[GeneratedQuestion] = []
        for q in questions:
            if not is_valid_question(q):
                logger.info(f"[Stage 4] Quality gate rejected: {q.question_text[:80]!r}")
                continue
            if any(
                _jaccard(q.question_text, kept.question_text) >= DUPLICATE_JACCARD_THRESHOLD
                for kept in valid
            ):
                logger.info(f"[Stage 4] Duplicate rejected: {q.question_text[:80]!r}")
                continue
            valid.append(q)
            if len(valid) >= question_count:
                break
        return valid
    except Exception as e:
        logger.error(f"[Stage 4] Unexpected error during quality filtering: {e}", exc_info=True)
        return []


async def run_pipeline(
    text: str,
    question_type: Literal["mcq", "scenario", "mixed"],
    question_count: int,
) -> list[GeneratedQuestion]:
    logger.info(f"Pipeline start: type={question_type}, count={question_count}")

    try:
        layer1 = clean_extracted_text(text)
        if not layer1:
            raise ValueError("Text is empty after extraction cleanup.")

        cleaned_text = preprocess(layer1)
        if not cleaned_text or len(cleaned_text.split()) < 20:
            raise ValueError("Text is too short to generate questions from.")
        logger.info(f"[Stage 1] Cleaned text ready: {len(cleaned_text)} chars")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"[Stage 1] Preprocessing failed unexpectedly: {e}") from e

    try:
        target_count = max(question_count + 2, int(question_count * 1.5))
        raw_response = await generate_quiz_via_openrouter(
            cleaned_text=cleaned_text,
            question_type=question_type,
            question_count=target_count,
        )
        if raw_response is None:
            raise ValueError("Quiz generation service is temporarily unavailable.")
        logger.info(f"[Stage 2] OpenRouter returned {len(raw_response)} chars")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"[Stage 2] OpenRouter call failed unexpectedly: {e}") from e

    try:
        candidates = parse_and_validate_questions(raw_response, question_count=target_count)
        logger.info(f"[Stage 3] Parsed {len(candidates)} candidate questions")

        if len(candidates) < question_count:
            logger.warning(
                f"[Stage 3] Initial yield {len(candidates)}/{question_count} below "
                f"target — retrying at temperature={OPENROUTER_RETRY_TEMPERATURE}"
            )
            retry_raw = await generate_quiz_via_openrouter(
                cleaned_text=cleaned_text,
                question_type=question_type,
                question_count=target_count,
                temperature=OPENROUTER_RETRY_TEMPERATURE,
            )
            if retry_raw is not None:
                retry_candidates = parse_and_validate_questions(
                    retry_raw, question_count=target_count
                )
                candidates.extend(retry_candidates)
                logger.info(f"[Stage 3] After retry: {len(candidates)} total candidates")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"[Stage 3] Response parsing failed unexpectedly: {e}") from e

    try:
        final = filter_and_rank(candidates, question_count=question_count)
        if not final:
            raise ValueError(
                "Pipeline could not produce any valid questions. Try adding more resources."
            )
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"[Stage 4] Quality filtering failed unexpectedly: {e}") from e

    logger.info(f"Pipeline complete: returned {len(final)} questions")
    return final
