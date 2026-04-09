"""
Shared pytest fixtures for quiz-ml tests.

Strategy
--------
* All heavy model inference (T5, KeyBERT) is stubbed via monkeypatch so tests
  never download or load real weights.
* Deterministic dummy outputs let every assertion be exact.
* The FastAPI TestClient is built against the real app object; the lifespan
  startup is bypassed by pre-loading the model cache with dummy objects before
  the client is created.
"""

import sys
import os
import types
import pytest

# ---------------------------------------------------------------------------
# Ensure the service root is on sys.path so `import model_cache` works
# ---------------------------------------------------------------------------
SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_ROOT not in sys.path:
    sys.path.insert(0, SERVICE_ROOT)


# ---------------------------------------------------------------------------
# Minimal stub objects that satisfy model_cache getter expectations
# ---------------------------------------------------------------------------

class _DummyTokenizer:
    """Mimics HuggingFace tokenizer encode/decode/call interface."""

    def encode(self, text, add_special_tokens=True):
        # Return a rough token count (1 token ≈ 4 chars)
        return list(range(max(1, len(text) // 4)))

    def __call__(self, texts, max_length=512, padding=True, truncation=True, return_tensors=None):
        if isinstance(texts, str):
            texts = [texts]
        import types
        batch = types.SimpleNamespace()
        batch.input_ids = [[1, 2, 3]] * len(texts)
        batch.attention_mask = [[1, 1, 1]] * len(texts)
        return batch

    def decode(self, token_ids, skip_special_tokens=True):
        return "What is machine learning?"


class _DummyT5Model:
    """Mimics T5ForConditionalGeneration.generate()."""

    def eval(self):
        return self

    def generate(self, input_ids, attention_mask=None, **kwargs):
        # Return one output tensor per input
        import types
        n = len(input_ids)
        return [[1, 2, 3]] * n


class _DummyKeyBERT:
    """Mimics KeyBERT.extract_keywords()."""

    def extract_keywords(self, text, keyphrase_ngram_range=(1, 1), stop_words=None,
                         top_n=5, use_maxsum=False, nr_candidates=20):
        # Return deterministic keyphrases based on top_n
        phrases = ["machine learning", "neural network", "deep learning",
                   "supervised learning", "gradient descent"]
        return [(p, 0.85) for p in phrases[:top_n]]


@pytest.fixture(autouse=True)
def stub_model_cache(monkeypatch):
    """
    Patch model_cache singletons with dummy stubs for every test.
    This prevents any real model loading and makes outputs deterministic.
    """
    import model_cache

    monkeypatch.setattr(model_cache, "_t5_tokenizer", _DummyTokenizer())
    monkeypatch.setattr(model_cache, "_t5_model", _DummyT5Model())
    monkeypatch.setattr(model_cache, "_keybert_model", _DummyKeyBERT())
    monkeypatch.setattr(model_cache, "_models_loaded", True)


@pytest.fixture(autouse=True)
def stub_nltk(monkeypatch):
    """
    Stub NLTK functions used in the pipeline so no corpus data is needed.
    """
    import nltk

    # sent_tokenize → split on ". " as a simple proxy
    monkeypatch.setattr(
        "nltk.tokenize.sent_tokenize",
        lambda text, language="english": [s.strip() + "." for s in text.split(". ") if s.strip()],
    )

    # wordnet synsets → return empty list to force fallback distractors
    try:
        from nltk.corpus import wordnet
        monkeypatch.setattr(wordnet, "synsets", lambda word, pos=None: [])
    except Exception:
        pass


@pytest.fixture()
def test_client():
    """
    Returns a synchronous httpx TestClient for the FastAPI app.
    Models are already stubbed by stub_model_cache (autouse=True).
    """
    from fastapi.testclient import TestClient
    import main  # noqa: F401 — triggers lifespan via TestClient context

    with TestClient(main.app) as client:
        yield client
