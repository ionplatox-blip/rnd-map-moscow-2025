import os
import time
import json
import logging
import faiss
import numpy as np
import gc
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aisearch")

# Load Env
load_dotenv(".env")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_REWRITE = os.getenv("LLM_MODEL_REWRITE", "google/gemini-2.0-flash-lite-001")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "openai/text-embedding-3-small")

# Globals
app = FastAPI(title="R&D Map AI Search MVP")
faiss_index = None
metadata = []
openai_client = None

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class SearchRequest(BaseModel):
    query: str
    top_k_candidates: int = 50
    top_k_results: int = 10
    use_rerank: bool = True
    use_rewrite: bool = True

class SearchResult(BaseModel):
    project_id: str
    center_id: str
    center_name: str
    title: str
    year: str
    score: float
    why_matched: Optional[str] = None
    evidence_snippets: List[str] = []

class SearchResponse(BaseModel):
    query_original: str
    rewritten_query: Optional[str] = None
    timings_ms: dict
    results: List[SearchResult]


def get_embedding(text: str) -> np.ndarray:
    """Get embedding via OpenRouter (OpenAI-compatible API)."""
    if not openai_client:
        raise RuntimeError("OpenAI client not initialized")
    resp = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return np.array(resp.data[0].embedding, dtype="float32")


@app.on_event("startup")
async def startup_event():
    global faiss_index, metadata, openai_client

    # 1. Init OpenRouter client (used for BOTH rewrite AND embeddings)
    if OPENROUTER_API_KEY:
        openai_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        logger.info(f"OpenRouter Client Init Success. Embedding model: {EMBEDDING_MODEL}")
    else:
        logger.warning("OPENROUTER_API_KEY missing!")

    # 2. Load FAISS Index (using MMAP for memory efficiency)
    logger.info("Loading FAISS Index with MMAP...")
    index_paths = ["faiss.index", "fastapi_server/faiss.index", "../faiss.index"]
    for p in index_paths:
        if os.path.exists(p):
            faiss_index = faiss.read_index(p, faiss.IO_FLAG_MMAP)
            logger.info(f"Loaded index from {p} ({faiss_index.ntotal} vectors) using MMAP.")
            break
    if not faiss_index:
        logger.warning("FAISS index not found!")

    gc.collect()

    # 3. Load Metadata (as raw strings to minimize Python object overhead)
    logger.info("Loading Metadata (Lazy)...")
    meta_paths = ["projects_metadata.jsonl", "fastapi_server/projects_metadata.jsonl", "../projects_metadata.jsonl"]
    for p in meta_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                metadata = f.readlines()
            logger.info(f"Loaded {len(metadata)} raw metadata lines.")
            break
    if not metadata:
        logger.warning("Metadata not found!")

    gc.collect()
    logger.info("Startup complete. No heavy ML models in memory.")


def rewrite_query(query: str) -> str:
    if not openai_client:
        return query
    try:
        completion = openai_client.chat.completions.create(
            model=MODEL_REWRITE,
            messages=[
                {"role": "system", "content": "You are a bilingual (RU/EN) technical search assistant. Rewrite user query into precise scientific/engineering terminology. Return ONLY the rewritten query. No quotes."},
                {"role": "user", "content": f"Query: {query}"}
            ]
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Rewrite failed: {e}")
        return query


@app.post("/ai-search", response_model=SearchResponse)
async def search(req: SearchRequest):
    t0 = time.time()
    timings = {}

    # 1. Rewrite
    q_search = req.query
    rewritten = None
    if req.use_rewrite and openai_client:
        t_start = time.time()
        q_search = rewrite_query(req.query)
        rewritten = q_search
        timings["rewrite"] = (time.time() - t_start) * 1000

    # 2. Embed via OpenRouter API (no local model needed!)
    t_start = time.time()
    if not openai_client:
        raise HTTPException(500, "OpenRouter client not initialized")

    try:
        vec = get_embedding(q_search).reshape(1, -1)
        faiss.normalize_L2(vec)
    except Exception as e:
        logger.error(f"Embedding API call failed: {e}")
        raise HTTPException(500, f"Embedding failed: {e}")

    timings["embed"] = (time.time() - t_start) * 1000

    # 3. Retrieve
    t_start = time.time()
    if not faiss_index:
        raise HTTPException(500, "FAISS Index not loaded")

    scores, indices = faiss_index.search(vec, req.top_k_candidates)
    timings["retrieve"] = (time.time() - t_start) * 1000

    candidates = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        try:
            meta = json.loads(metadata[idx])
        except Exception as e:
            logger.error(f"Failed to parse metadata at index {idx}: {e}")
            continue

        candidates.append({
            "project_id": meta["project_id"],
            "center_id": meta["center_id"],
            "center_name": meta["center_name"],
            "title": meta["title"],
            "year": str(meta.get("year", "N/A")),
            "score": float(score),
            "evidence_snippets": [f"Семантическое сходство: {score:.4f}"]
        })

    # 4. Rerank / Limit
    results_raw = candidates[:req.top_k_results]
    results = [SearchResult(**r) for r in results_raw]

    return {
        "query_original": req.query,
        "rewritten_query": rewritten,
        "timings_ms": {**timings, "total": (time.time() - t0) * 1000},
        "results": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
