"""
EZY Notez — Quiz ML Microservice
FastAPI app that exposes a single /generate-quiz endpoint backed by an
OpenRouter LLM. No local ML models are loaded — startup only ensures the
NLTK sentence tokenizer data is present.
"""

import logging
import os
import re
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import GenerateRequest, GenerateResponse, HealthResponse
from pipeline import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_STAGE_PATTERN = re.compile(r"\[Stage\s+(\d+)\]")


def _extract_stage(message: str) -> str:
    """Return 'stage_N' from a '[Stage N] ...' error message, or 'pipeline' if absent."""
    m = _STAGE_PATTERN.search(message)
    return f"stage_{m.group(1)}" if m else "pipeline"


def _ensure_nltk_data() -> None:
    """Download NLTK punkt tokenizer data if missing. Safe to call repeatedly."""
    import nltk
    for pkg in ("punkt_tab", "punkt"):
        try:
            nltk.download(pkg, quiet=True)
        except Exception as e:
            logger.warning(f"NLTK download warning for {pkg}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure NLTK data is available on startup. No model loading required."""
    logger.info("Starting up Quiz ML service — preparing NLTK data...")
    try:
        _ensure_nltk_data()
        logger.info("NLTK data ready. Service is online.")
    except Exception as e:
        logger.error(f"NLTK data preparation failed: {e}")

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        logger.warning(
            "OPENROUTER_API_KEY is not set — quiz generation will be unavailable "
            "until the key is configured."
        )

    yield


app = FastAPI(title="EZY Notez Quiz ML", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    """
    Service is ready as soon as the process is up — there are no local
    models to load. The models_loaded field is retained for backwards
    compatibility with existing clients and is always True.
    """
    return HealthResponse(status="ok", models_loaded=True)


@app.post("/generate-quiz", response_model=GenerateResponse)
async def generate_quiz(request: GenerateRequest):
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail={
                "error": True,
                "stage": "configuration",
                "message": "OPENROUTER_API_KEY is not configured on this server.",
            },
        )

    try:
        questions = await run_pipeline(
            text=request.text,
            question_type=request.question_type,
            question_count=request.question_count,
        )
        return GenerateResponse(questions=questions)
    except ValueError as e:
        msg = str(e)
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "stage": _extract_stage(msg),
                "message": msg,
            },
        )
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "stage": "pipeline",
                "message": "Question generation failed due to an unexpected error.",
            },
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
