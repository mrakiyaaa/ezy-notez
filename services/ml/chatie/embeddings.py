"""
Chunking and embedding utilities using Gemini text-embedding-004.
"""

import logging
import os
import re

from google import genai

logger = logging.getLogger(__name__)

CHUNK_TARGET_TOKENS = 500
CHUNK_OVERLAP_TOKENS = 50
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768
BATCH_SIZE = 100


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})


def _approximate_tokens(text: str) -> int:
    return len(text.split())


def chunk_text(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        stokens = _approximate_tokens(sentence)

        if current_tokens + stokens > CHUNK_TARGET_TOKENS and current:
            chunks.append(" ".join(current))

            overlap: list[str] = []
            overlap_tokens = 0
            for s in reversed(current):
                st = _approximate_tokens(s)
                if overlap_tokens + st > CHUNK_OVERLAP_TOKENS:
                    break
                overlap.insert(0, s)
                overlap_tokens += st

            current = overlap
            current_tokens = overlap_tokens

        current.append(sentence)
        current_tokens += stokens

    if current:
        chunks.append(" ".join(current))

    return chunks if chunks else [text.strip()] if text.strip() else []


def embed_texts(texts: list[str]) -> list[list[float]]:
    client = _get_client()
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config={"task_type": "RETRIEVAL_DOCUMENT", "output_dimensionality": EMBEDDING_DIMENSION},
        )
        for emb in result.embeddings:
            all_embeddings.append(emb.values)

    return all_embeddings


def embed_query(text: str) -> list[float]:
    client = _get_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={"task_type": "RETRIEVAL_QUERY", "output_dimensionality": EMBEDDING_DIMENSION},
    )
    return result.embeddings[0].values
