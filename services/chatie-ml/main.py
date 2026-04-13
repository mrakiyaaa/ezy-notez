"""
EZY Notez — Chatie ML Microservice
FastAPI app exposing RAG chat endpoints backed by Gemini embeddings and generation.
"""

import json
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from google import genai

from db import get_supabase
from embeddings import chunk_text, embed_texts, embed_query
from models import (
    EmbedRequest,
    EmbedResponse,
    ChatRequest,
    ChatResponse,
    ChatSource,
    ChatHistoryItem,
    ChatHistoryResponse,
    HealthResponse,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

GENERATION_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = (
    "You are Chatie, a friendly academic AI assistant built into EzyNotez, a student study platform. "
    "You have two modes:\n"
    "1. For greetings, small talk, or casual messages (e.g. 'hi', 'hello', 'how are you', 'thanks'), "
    "respond naturally and warmly in 1-2 short sentences — like a helpful study buddy. Do NOT mention resources for these.\n"
    "2. For academic or study-related questions, answer using ONLY the provided context from the "
    "student's uploaded resources. Be clear, concise, and academic. "
    "If the answer is not in the resources, say so briefly.\n"
    "Never be robotic. Keep responses short and friendly."
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Chatie ML service...")
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set — Chatie will be unavailable.")
    else:
        logger.info("Gemini configured. Service is online.")

    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    if not supabase_url:
        logger.warning("SUPABASE_URL is not set — database operations will fail.")

    yield


app = FastAPI(title="EZY Notez Chatie ML", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


@app.post("/embed-resource", response_model=EmbedResponse)
async def embed_resource(request: EmbedRequest):
    supabase = get_supabase()

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is empty")

    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="No chunks produced from text")

    logger.info(
        f"Embedding resource={request.resource_id}: {len(chunks)} chunks"
    )

    embeddings = embed_texts(chunks)

    supabase.table("resource_embeddings").delete().eq(
        "resource_id", request.resource_id
    ).execute()

    rows = [
        {
            "workspace_id": request.workspace_id,
            "resource_id": request.resource_id,
            "chunk_index": i,
            "chunk_text": chunk,
            "embedding": json.dumps(emb),
        }
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]

    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        result = supabase.table("resource_embeddings").insert(batch).execute()
        if hasattr(result, "error") and result.error:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to insert embeddings: {result.error}",
            )

    logger.info(
        f"Embedded resource={request.resource_id}: {len(chunks)} chunks stored"
    )
    return EmbedResponse(success=True, chunks_embedded=len(chunks))


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    supabase = get_supabase()

    query_embedding = embed_query(request.message)

    if request.resource_ids:
        resource_filter = (
            f"AND resource_id IN ("
            + ",".join(f"'{rid}'" for rid in request.resource_ids)
            + ")"
        )
    else:
        resource_filter = ""

    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    rpc_result = supabase.rpc(
        "match_resource_embeddings",
        {
            "query_embedding": embedding_str,
            "filter_workspace_id": request.workspace_id,
            "filter_resource_ids": request.resource_ids if request.resource_ids else [],
            "match_count": 5,
        },
    ).execute()

    chunks = rpc_result.data if rpc_result.data else []

    context_parts: list[str] = []
    sources: list[ChatSource] = []
    for chunk in chunks:
        context_parts.append(chunk["chunk_text"])
        sources.append(
            ChatSource(
                resource_id=chunk["resource_id"],
                chunk_text=chunk["chunk_text"],
            )
        )

    context_block = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant context found in the uploaded resources."

    user_prompt = (
        f"CONTEXT FROM STUDENT RESOURCES:\n{context_block}\n\n"
        f"STUDENT QUESTION:\n{request.message}"
    )

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "").strip(), http_options={"api_version": "v1beta"})
    generation = client.models.generate_content(
        model=GENERATION_MODEL,
        contents=user_prompt,
        config={"system_instruction": SYSTEM_PROMPT},
    )
    assistant_response = generation.text.strip()

    sources_json = [s.model_dump() for s in sources] if sources else None

    supabase.table("chat_history").insert(
        {
            "workspace_id": request.workspace_id,
            "user_id": request.user_id,
            "session_id": request.session_id,
            "role": "user",
            "content": request.message,
        }
    ).execute()

    supabase.table("chat_history").insert(
        {
            "workspace_id": request.workspace_id,
            "user_id": request.user_id,
            "session_id": request.session_id,
            "role": "assistant",
            "content": assistant_response,
            "sources": json.dumps(sources_json) if sources_json else None,
        }
    ).execute()

    return ChatResponse(response=assistant_response, sources=sources)


@app.get("/chat-history/{workspace_id}/{user_id}/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(workspace_id: str, user_id: str, session_id: str):
    supabase = get_supabase()

    result = (
        supabase.table("chat_history")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )

    items: list[ChatHistoryItem] = []
    for row in result.data or []:
        sources_raw = row.get("sources")
        sources = None
        if sources_raw:
            if isinstance(sources_raw, str):
                parsed = json.loads(sources_raw)
            else:
                parsed = sources_raw
            if isinstance(parsed, list):
                sources = [
                    ChatSource(
                        resource_id=s.get("resource_id", ""),
                        chunk_text=s.get("chunk_text", ""),
                    )
                    for s in parsed
                ]
        items.append(
            ChatHistoryItem(
                id=row["id"],
                workspace_id=row["workspace_id"],
                user_id=row["user_id"],
                role=row["role"],
                content=row["content"],
                sources=sources,
                created_at=row["created_at"],
            )
        )

    return ChatHistoryResponse(history=items)


@app.delete("/chat-history/{workspace_id}/{user_id}/{session_id}")
async def delete_chat_history(workspace_id: str, user_id: str, session_id: str):
    supabase = get_supabase()

    supabase.table("chat_history").delete().eq(
        "workspace_id", workspace_id
    ).eq("user_id", user_id).eq("session_id", session_id).execute()

    return {"success": True, "message": "Chat history cleared"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CHATIE_PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
