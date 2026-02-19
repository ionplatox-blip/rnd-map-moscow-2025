"""
Build FAISS index using OpenRouter's embedding API (text-embedding-3-small).
Generates 1536-dimensional embeddings.

Uses batch API for fast processing. No rate limit issues with paid key.

Usage:
    OPENROUTER_API_KEY=... python scripts/build_index.py
"""
import json
import numpy as np
import faiss
import time
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Config
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "openai/text-embedding-3-small")
INPUT_FILE = "projects_search_text.jsonl"
OUTPUT_INDEX = "faiss.index"
BATCH_SIZE = 100  # OpenAI API supports batches


def main():
    if not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY not set!")
        return

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
    print(f"Using model: {EMBEDDING_MODEL} via OpenRouter")

    # Load data
    print(f"Loading data from {INPUT_FILE}...")
    texts = []
    ids = []

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            texts.append(item["search_text"])
            ids.append(item["project_id"])

    print(f"Loaded {len(texts)} projects.")

    # Encode in batches
    print(f"Encoding via OpenRouter API (batch_size={BATCH_SIZE})...")
    start_time = time.time()
    all_embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE

        try:
            resp = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch,
            )
            batch_embeddings = [item.embedding for item in resp.data]
            all_embeddings.extend(batch_embeddings)
            
            elapsed = time.time() - start_time
            print(f"  Batch {batch_num}/{total_batches} done "
                  f"({len(all_embeddings)}/{len(texts)}) | {elapsed:.1f}s elapsed")
        except Exception as e:
            print(f"  ERROR on batch {batch_num}: {e}")
            # Try individual items as fallback
            for j, text in enumerate(batch):
                try:
                    resp = client.embeddings.create(
                        model=EMBEDDING_MODEL,
                        input=text,
                    )
                    all_embeddings.append(resp.data[0].embedding)
                except Exception as e2:
                    print(f"    Item {i+j} failed: {e2}")
                    all_embeddings.append([0.0] * 1536)  # zero vector placeholder
                time.sleep(0.1)

    embeddings = np.array(all_embeddings, dtype="float32")
    print(f"Encoding finished in {time.time() - start_time:.1f}s. Shape: {embeddings.shape}")

    # Build FAISS index
    d = embeddings.shape[1]
    print(f"Building FAISS index (dim={d})...")

    # Normalize for cosine similarity
    faiss.normalize_L2(embeddings)

    index = faiss.IndexFlatIP(d)
    index.add(embeddings)

    print(f"Index size: {index.ntotal}")

    # Save
    faiss.write_index(index, OUTPUT_INDEX)
    print(f"Index saved to {OUTPUT_INDEX}")

if __name__ == "__main__":
    main()
