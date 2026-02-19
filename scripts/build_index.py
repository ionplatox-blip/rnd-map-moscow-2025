import json
import numpy as np
import faiss
from fastembed import TextEmbedding
import time
import os
from dotenv import load_dotenv

load_dotenv()

# Config
# We use the same model as in the backend
MODEL_NAME = os.getenv("EMBEDDINGS_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
INPUT_FILE = "projects_search_text.jsonl"
OUTPUT_INDEX = "faiss.index"
BATCH_SIZE = 64

def main():
    print(f"Loading model: {MODEL_NAME} via fastembed...")
    model = TextEmbedding(model_name=MODEL_NAME)
    
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
    
    # Encode
    print("Encoding...")
    start_time = time.time()
    # model.embed returns a generator of numpy arrays
    embeddings_gen = model.embed(texts, batch_size=BATCH_SIZE)
    embeddings = np.array(list(embeddings_gen)).astype('float32')
    print(f"Encoding finished in {time.time() - start_time:.2f}s.")
    
    # Build FAISS index
    d = embeddings.shape[1]
    print(f"Building FAISS index (dim={d})...")
    
    # Start with Inner Product (Cosine Similarity for normalized vectors)
    # Normalize embeddings first
    faiss.normalize_L2(embeddings)
    
    index = faiss.IndexFlatIP(d)
    index.add(embeddings)
    
    print(f"Index size: {index.ntotal}")
    
    # Save
    faiss.write_index(index, OUTPUT_INDEX)
    print(f"Index saved to {OUTPUT_INDEX}")
    
    # Save IDs mapping (row_id -> project_id)
    # We can rely on line number in metadata.jsonl matching index row_id, 
    # but for safety let's assume strict correspondence 0..N.
    # We verify this in server logic.

if __name__ == "__main__":
    main()
