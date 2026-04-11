"""
EZY Notez — Quiz ML Microservice
FastAPI app that exposes a single /generate-quiz endpoint.
Models are loaded once at startup via the lifespan context manager.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import model_cache
from models import GenerateRequest, GenerateResponse, HealthResponse
from pipeline import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all ML models on startup; nothing to do on shutdown."""
    logger.info("Starting up Quiz ML service — loading models...")
    try:
        model_cache.load_all()
        logger.info("Models loaded. Service is ready.")
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        # Service still starts; /health will report models_loaded=False
    yield


app = FastAPI(title="EZY Notez Quiz ML", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok" if model_cache.are_models_loaded() else "loading",
        models_loaded=model_cache.are_models_loaded(),
    )


@app.post("/generate-quiz", response_model=GenerateResponse)
async def generate_quiz(request: GenerateRequest):
    if not model_cache.are_models_loaded():
        raise HTTPException(
            status_code=503,
            detail="Models are still loading. Please retry in a moment.",
        )

    try:
        questions = await run_pipeline(
            text=request.text,
            question_type=request.question_type,
            question_count=request.question_count,
        )
        return GenerateResponse(questions=questions)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Question generation failed.")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
