"""
EZY Notez — Unified ML Service

Combines the Quiz generation service and the Chatie RAG chat service into a
single FastAPI application, exposed under /quiz/* and /chatie/* routers.
Designed to run as one container on Railway (or any Docker host) on PORT
8000 by default (honours $PORT at runtime for Railway compatibility).
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from quiz.router import router as quiz_router
from chatie.router import router as chatie_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


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
    logger.info("Starting unified ML service...")

    try:
        _ensure_nltk_data()
        logger.info("NLTK tokenizer data ready.")
    except Exception as e:
        logger.error(f"NLTK preparation failed: {e}")

    if not os.environ.get("OPENROUTER_API_KEY", "").strip():
        logger.warning(
            "OPENROUTER_API_KEY is not set — quiz generation will be unavailable "
            "until the key is configured."
        )
    else:
        logger.info("OpenRouter configured for quiz generation.")

    if not os.environ.get("GEMINI_API_KEY", "").strip():
        logger.warning(
            "GEMINI_API_KEY is not set — Chatie embedding and chat will be unavailable."
        )
    else:
        logger.info("Gemini configured for Chatie RAG.")

    if not os.environ.get("SUPABASE_URL", "").strip() or not os.environ.get(
        "SUPABASE_SERVICE_ROLE_KEY", ""
    ).strip():
        logger.warning(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — Chatie "
            "database operations will fail."
        )

    logger.info("Unified ML service is online.")
    yield
    logger.info("Unified ML service shutting down.")


app = FastAPI(
    title="EZY Notez Unified ML Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(quiz_router, prefix="/quiz", tags=["quiz"])
app.include_router(chatie_router, prefix="/chatie", tags=["chatie"])


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
