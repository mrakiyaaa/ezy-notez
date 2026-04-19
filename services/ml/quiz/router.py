"""
Quiz router — mounted at /quiz/*.

Preserves the original Quiz ML service request/response contracts:
- GET  /quiz/health         -> HealthResponse
- POST /quiz/generate-quiz  -> GenerateResponse
"""

import logging
import os
import re

from fastapi import APIRouter, HTTPException

from .models import GenerateRequest, GenerateResponse, HealthResponse
from .pipeline import run_pipeline

logger = logging.getLogger(__name__)
_STAGE_PATTERN = re.compile(r"\[Stage\s+(\d+)\]")


def _extract_stage(message: str) -> str:
    m = _STAGE_PATTERN.search(message)
    return f"stage_{m.group(1)}" if m else "pipeline"


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", models_loaded=True)


@router.post("/generate-quiz", response_model=GenerateResponse)
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
