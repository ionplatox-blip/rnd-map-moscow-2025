# R&D Map of Moscow (R&D Карта Москвы)

## Project Overview
Interactive map of Research & Development centers in Moscow, visualizing data from EGISU NIOKTR for 2025.

- **Status**: Version 1.1 (AI-Enhanced)
- **Live Site**: [https://rnd-map-moscow-2025.onrender.com](https://rnd-map-moscow-2025.onrender.com)
- **Source Code**: [https://github.com/ionplatox-blip/rnd-map-moscow-2025](https://github.com/ionplatox-blip/rnd-map-moscow-2025)

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend (AI Search)**: FastAPI + Python + FAISS
- **LLM Integration**: OpenRouter (Gemini 2.0 / GPT-4o-mini)
- **Map Engine**: Leaflet (react-leaflet) + OpenStreetMap
- **Styling**: CSS (Glassmorphism design system)
- **Data**: JSON + Vector Embeddings (Sentence-Transformers)

## Key Features
- **AI Semantic Search**: Uses vector embeddings to find projects by meaning, not just keywords.
- **AI Query Rewriting**: Uses LLMs to refine user queries into professional R&D terminology.
- **Interactive Map**: Clustering markers, color-coded by funding tier.
- **Sorting Logic**: Prioritizes "In Progress" projects and sorts by date descending.
- **Organization Details**:
  - Detailed sidebar with project lists and RID (Intellectual Property) counts.
  - Financial data visualization.
  - "Go to Organization" flow with persistent project highlighting.

## Project Structure
- `/app`: React application (Frontend)
- `/fastapi_server`: AI Search API (Backend)
- `/scripts`: Data processing and indexing utilities
- `faiss.index`: Vector database for semantic search
- `projects_metadata.jsonl`: Metadata for fast lookup

## Context for AI
1. **AI Search**: Backend logic in `fastapi_server/main.py`. Frontend calls `/ai-search`.
2. **Search Logic**: Token-based logic in `App.tsx` (Sidebar sorting) + Vector search on backend.
3. **Map Interaction**: `MapView.tsx` handles markers and popups.
4. **Data format**: Hybrid storage (Static JSON for mapping, JSONL for search metadata).
