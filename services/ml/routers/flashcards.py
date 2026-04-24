"""
Flashcard router — mounted at /flashcards/*.

Exposes:
- GET  /flashcards/health    -> HealthResponse
- POST /flashcards/generate  -> GenerateResponse

Generation pipeline: Gemini 2.0 Flash (primary) → OpenRouter Llama (fallback).
"""

import json
import logging
import os
import re
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException
from google import genai
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GEMINI_MODEL = "gemini-2.0-flash"

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct"
OPENROUTER_HTTP_REFERER = "https://ezynotez.com"
OPENROUTER_APP_TITLE = "EZY Notez"
OPENROUTER_TIMEOUT_SECONDS = 30

MAX_INPUT_WORDS = 30_000
MIN_INPUT_WORDS = 15

# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class GeminiGenerationError(Exception):
    pass


class OpenRouterGenerationError(Exception):
    pass


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=50)
    count: int = Field(default=10, ge=5, le=30)
    topic: Optional[str] = None


class Flashcard(BaseModel):
    front: str
    back: str


class GenerateResponse(BaseModel):
    flashcards: list[Flashcard]
    count: int
    provider: str


class HealthResponse(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------------------------


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# ---------------------------------------------------------------------------
# Prompt builder (shared by both providers)
# ---------------------------------------------------------------------------


def _build_prompt(text: str, count: int, topic: Optional[str]) -> str:
    topic_line = f"\nTopic focus: {topic}" if topic else ""
    return (
        "You are an academic flashcard generator for university students.\n"
        f"Generate exactly {count} flashcards from the source text below.{topic_line}\n\n"
        "Each flashcard must be a concept-definition or question-answer pair.\n"
        "Return ONLY a valid JSON array — no markdown fences, no preamble, no explanation.\n"
        "Every element must match this schema exactly:\n"
        '[{"front": "question or concept", "back": "answer or definition"}]\n\n'
        f"SOURCE TEXT:\n{text}"
    )


# ---------------------------------------------------------------------------
# Response parsing (shared by both providers)
# ---------------------------------------------------------------------------


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_and_validate(raw: str) -> list[dict]:
    stripped = _strip_fences(raw)
    start = stripped.find("[")
    end = stripped.rfind("]")
    if start >= 0 and end > start:
        stripped = stripped[start : end + 1]

    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON decode failed: {exc}") from exc

    if not isinstance(parsed, list) or len(parsed) == 0:
        raise ValueError("Response is not a non-empty JSON array")

    for i, card in enumerate(parsed):
        if not isinstance(card, dict):
            raise ValueError(f"Item {i} is not an object")
        if not isinstance(card.get("front"), str) or not isinstance(card.get("back"), str):
            raise ValueError(f"Item {i} missing 'front' or 'back' string fields")

    return parsed


# ---------------------------------------------------------------------------
# Provider: Gemini (primary)
# ---------------------------------------------------------------------------


def generate_flashcards_via_gemini(
    text: str, count: int, topic: Optional[str]
) -> list[dict]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise GeminiGenerationError("GEMINI_API_KEY is not configured")

    prompt = _build_prompt(text, count, topic)

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        raw = response.text
    except Exception as exc:
        raise GeminiGenerationError(f"Gemini API call failed: {exc}") from exc

    try:
        return _parse_and_validate(raw)
    except ValueError as exc:
        raise GeminiGenerationError(f"Gemini response validation failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Provider: OpenRouter (fallback)
# ---------------------------------------------------------------------------


def generate_flashcards_via_openrouter(
    text: str, count: int, topic: Optional[str]
) -> list[dict]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise OpenRouterGenerationError("OPENROUTER_API_KEY is not configured")

    prompt = _build_prompt(text, count, topic)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": OPENROUTER_HTTP_REFERER,
        "X-Title": OPENROUTER_APP_TITLE,
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
    }

    try:
        resp = requests.post(
            OPENROUTER_API_URL,
            json=payload,
            headers=headers,
            timeout=OPENROUTER_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"]
    except requests.exceptions.Timeout:
        raise OpenRouterGenerationError(
            f"OpenRouter request timed out after {OPENROUTER_TIMEOUT_SECONDS}s"
        )
    except requests.exceptions.RequestException as exc:
        raise OpenRouterGenerationError(f"OpenRouter request failed: {exc}") from exc
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterGenerationError(
            f"OpenRouter response shape invalid: {exc}"
        ) from exc

    try:
        return _parse_and_validate(raw)
    except ValueError as exc:
        raise OpenRouterGenerationError(
            f"OpenRouter response validation failed: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


@router.post("/generate", response_model=GenerateResponse)
def generate_flashcards(request: GenerateRequest):
    text = _clean(request.text)
    word_count = len(text.split())

    if word_count > MAX_INPUT_WORDS:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "stage": "validation",
                "message": f"Input too large ({word_count} words, max {MAX_INPUT_WORDS}).",
            },
        )
    if word_count < MIN_INPUT_WORDS:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "stage": "validation",
                "message": f"Input too short ({word_count} words, min {MIN_INPUT_WORDS}).",
            },
        )

    count = request.count
    topic = request.topic

    try:
        cards = generate_flashcards_via_gemini(text, count, topic)
        provider_used = "gemini"
    except GeminiGenerationError as exc:
        logger.warning(f"Gemini failed, falling back to OpenRouter: {exc}")
        try:
            cards = generate_flashcards_via_openrouter(text, count, topic)
            provider_used = "openrouter"
        except OpenRouterGenerationError as exc:
            logger.error(f"OpenRouter also failed: {exc}")
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Flashcard generation unavailable. Both AI providers failed. Please try again."
                },
            )

    return GenerateResponse(
        flashcards=[Flashcard(front=c["front"], back=c["back"]) for c in cards],
        count=len(cards),
        provider=provider_used,
    )
