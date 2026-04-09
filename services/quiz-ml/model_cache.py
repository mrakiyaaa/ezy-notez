"""
Singleton model loader.
All heavy models are loaded once at FastAPI startup and held in module-level
variables so every request reuses the same in-memory objects.
"""

import os
import logging

logger = logging.getLogger(__name__)

# Apply HuggingFace cache directory before any HF imports
_hf_cache = os.environ.get("HUGGINGFACE_CACHE_DIR", os.path.join(os.path.dirname(__file__), "model-cache"))
os.environ["HF_HOME"] = _hf_cache
os.environ["TRANSFORMERS_CACHE"] = _hf_cache

# Module-level singletons
_t5_tokenizer = None
_t5_model = None
_keybert_model = None
_models_loaded = False


def load_all() -> None:
    """
    Download (first run) and load all models into memory.
    Called once during FastAPI lifespan startup.
    """
    global _t5_tokenizer, _t5_model, _keybert_model, _models_loaded

    logger.info("Loading NLTK data...")
    import nltk
    for pkg in ("punkt_tab", "wordnet", "stopwords", "averaged_perceptron_tagger_eng", "omw-1.4"):
        try:
            nltk.download(pkg, quiet=True)
        except Exception as e:
            logger.warning(f"NLTK download warning for {pkg}: {e}")

    logger.info("Loading T5 question-generation model (valhalla/t5-base-qg-hl)...")
    import torch
    from transformers import T5ForConditionalGeneration, T5TokenizerFast

    with torch.no_grad():
        _t5_tokenizer = T5TokenizerFast.from_pretrained(
            "valhalla/t5-base-qg-hl",
            cache_dir=_hf_cache,
        )
        _t5_model = T5ForConditionalGeneration.from_pretrained(
            "valhalla/t5-base-qg-hl",
            cache_dir=_hf_cache,
        )
        _t5_model.eval()

    logger.info("Loading KeyBERT model (all-MiniLM-L6-v2)...")
    from keybert import KeyBERT
    _keybert_model = KeyBERT(model="all-MiniLM-L6-v2")

    _models_loaded = True
    logger.info("All models loaded successfully.")


def get_t5_tokenizer():
    return _t5_tokenizer


def get_t5_model():
    return _t5_model


def get_keybert():
    return _keybert_model


def are_models_loaded() -> bool:
    return _models_loaded
