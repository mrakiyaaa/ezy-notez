from typing import Literal
from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=50)
    question_type: Literal["mcq", "scenario", "mixed"]
    question_count: int = Field(..., ge=1, le=20)


class QuestionOption(BaseModel):
    id: str
    label: str  # "A", "B", "C", "D"
    text: str


class GeneratedQuestion(BaseModel):
    question_text: str
    question_type: Literal["mcq", "scenario"]
    options: list[QuestionOption]
    correct_option_id: str
    explanation: str
    topic_tag: str


class GenerateResponse(BaseModel):
    questions: list[GeneratedQuestion]


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
