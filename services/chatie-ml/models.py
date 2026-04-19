from typing import Literal
from pydantic import BaseModel, Field


class EmbedRequest(BaseModel):
    resource_id: str
    workspace_id: str
    text: str = Field(..., min_length=1)


class EmbedResponse(BaseModel):
    success: bool
    chunks_embedded: int


class ChatRequest(BaseModel):
    workspace_id: str
    user_id: str
    session_id: str
    message: str = Field(..., min_length=1)
    resource_ids: list[str] = Field(default_factory=list)


class ChatSource(BaseModel):
    resource_id: str
    chunk_text: str


class ChatResponse(BaseModel):
    response: str
    sources: list[ChatSource]


class ChatHistoryItem(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    sources: list[ChatSource] | None = None
    created_at: str


class ChatHistoryResponse(BaseModel):
    history: list[ChatHistoryItem]


class HealthResponse(BaseModel):
    status: str
