# R&D Map of Moscow (R&D Карта Москвы)

## Project Overview
Interactive map of Research & Development centers in Moscow, visualizing data from EGISU NIOKTR for 2025. The application helps users find organizations based on their competencies, funding, and research projects.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Map Engine**: Leaflet (react-leaflet) + OpenStreetMap
- **Styling**: CSS (Glassmorphism design system)
- **Data**: JSON-based static data (`map_index.json`, `center/*.json`) pre-processed from Python scripts.

## Key Features
- **Interactive Map**: Clustering markers, color-coded by funding tier.
- **Advanced Search**: Weighted keyword search, supports acronyms and "TehZadanie" (TZ) text matching.
- **Filtering**: Filter by funding amount (Small <100M, Medium 100M-1B, Large >1B).
- **Organization Details**:
  - Detailed sidebar with project lists and RID (Intellectual Property) counts.
  - Financial data visualization.
  - Full legal names displayed alongside acronyms.

## Data Pipeline
Data is processed using Python scripts in `../scripts/`:
- `preprocess.py`: Cleans raw Excel exports and generates JSON.
- `geocoding.py`: Geo-locates addresses (Yandex/OSM).
- `update_addresses.py`: Patches coordinates for specific organizations.

## Project Structure
- `/app`: React application
  - `/public/data`: Generated JSON data
  - `/src/components`: UI Components (MapView, Sidebar, Header, etc.)
- `/scripts`: Data processing utilities

## Context for AI
When working on this project:
1. **Search Logic**: Located in `App.tsx`. Uses token-based scoring.
2. **Map Interaction**: `MapView.tsx` handles markers and popups.
3. **Data format**: `map_index.json` is the main index. Detailed data is loaded on-demand from `data/centers/{ogrn}.json`.
