import os
import time
import json
import logging
import faiss
import numpy as np
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aisearch")

# Load Env
load_dotenv(".env")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_REWRITE = os.getenv("LLM_MODEL_REWRITE", "google/gemini-2.0-flash-lite-preview-02-05:free")
MODEL_RERANK = os.getenv("LLM_MODEL_RERANK", "google/gemini-2.0-flash-lite-preview-02-05:free")
EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

# Globals
app = FastAPI(title="R&D Map AI Search MVP")
embed_model = None
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


# Startup
@app.on_event("startup")
def startup_event():
    global embed_model, faiss_index, metadata, openai_client
    
    logger.info("Loading Embedding Model...")
    embed_model = SentenceTransformer(EMBEDDINGS_MODEL)
    
    logger.info("Loading FAISS Index...")
    # Try multiple paths
    index_paths = ["faiss.index", "scripts/faiss.index", "../faiss.index"]
    for p in index_paths:
        if os.path.exists(p):
            faiss_index = faiss.read_index(p)
            logger.info(f"Loaded index from {p} ({faiss_index.ntotal} vectors).")
            break
    if not faiss_index:
        logger.warning("FAISS index not found in common paths! Run scripts/build_index.py first.")
        
    logger.info("Loading Metadata...")
    meta_paths = ["projects_metadata.jsonl", "scripts/projects_metadata.jsonl", "../projects_metadata.jsonl"]
    for p in meta_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                metadata = [json.loads(line) for line in f]
            logger.info(f"Loaded {len(metadata)} metadata records from {p}.")
            break
    if not metadata:
        logger.warning("Metadata not found!")

        
    if OPENROUTER_API_KEY:
        openai_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        logger.info(f"OpenAI Client Init. Model: {MODEL_REWRITE}")
    else:
        logger.warning("OPENROUTER_API_KEY missing! LLM features disabled.")

# Logic
def rewrite_query(query: str) -> str:
    if not openai_client:
        return query
    
    start = time.time()
    try:
        completion = openai_client.chat.completions.create(
            model=MODEL_REWRITE,
            messages=[
                {"role": "system", "content": "You are a bilingual (RU/EN) technical search assistant. Rewrite user query into precise scientific/engineering terminology. Return ONLY the rewritten query in the same language as input (or English if technical). No quotes."},
                {"role": "user", "content": f"Query: {query}"}
            ]
        )
        rewritten = completion.choices[0].message.content.strip()
        logger.info(f"Rewrite: {query} -> {rewritten} ({time.time()-start:.2f}s)")
        return rewritten
    except Exception as e:
        logger.error(f"Rewrite failed: {e}")
        return query

def rerank_results(query: str, candidates: List[dict], top_k: int) -> List[dict]:
    if not openai_client:
        return candidates[:top_k]
    
    # Construct prompt
    candidates_text = ""
    for i, c in enumerate(candidates):
        # We need the full search text for valid reranking, but metadata only has title/year.
        # Ideally we load search text too. 
        # For now, let's use Title. If search_text is needed validation, we should have loaded it.
        # Let's assume we load search text into memory or read lazily.
        # Quick fix: Load search texts into memory at startup too? 20k lines, OK.
        pass

    # ... simplified rerank for now: just return candidates
    # To implement rerank properly we need the project abstract.
    # Let's Skip complex rerank in MVP v0.1 and just return FAISS results with dummy "ai_score".
    return candidates[:top_k]

# Better Rerank: requires loading abstract.
# Let's load abstract in metadata for MVP usage?
# In prepare_data.py, I excluded abstract from metadata to save memory?
# "We store minimal metadata for display. Full text is only in search_text."
# I should load search_text for reranking.

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
        
    # 2. Embed
    t_start = time.time()
    vec = embed_model.encode([q_search], convert_to_numpy=True)
    faiss.normalize_L2(vec)
    timings["embed"] = (time.time() - t_start) * 1000
    
    # 3. Retrieve
    t_start = time.time()
    if not faiss_index:
        raise HTTPException(500, "Index not loaded")
        
    scores, indices = faiss_index.search(vec, req.top_k_candidates)
    timings["retrieve"] = (time.time() - t_start) * 1000
    
    candidates = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        meta = metadata[idx]
        candidates.append({
            "project_id": meta["project_id"],
            "center_id": meta["center_id"],
            "center_name": meta["center_name"],
            "title": meta["title"],
            "year": meta["year"],
            "score": float(score),
            "evidence_snippets": [f"Семантическое сходство: {score:.4f}"]
        })
        
    # 4. Rerank (Placeholder for MVP v0.1)
    results = candidates[:req.top_k_results]
    
    # 5. Explain (Placeholder)
    # If we had abstracts, we could ask LLM "Why?"
    
    return {
        "query_original": req.query,
        "rewritten_query": rewritten,
        "timings_ms": {**timings, "total": (time.time() - t0) * 1000},
        "results": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
