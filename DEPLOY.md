# Deployment Guide

**Status: DEPLOYED**
- **Live URL**: [https://rnd-map-moscow-2025.onrender.com](https://rnd-map-moscow-2025.onrender.com)
- **GitHub Repo**: [https://github.com/ionplatox-blip/rnd-map-moscow-2025](https://github.com/ionplatox-blip/rnd-map-moscow-2025)

## Update Instructions
To update the live site:
1. Commit your changes:
   ```bash
   git add .
   git commit -m "Update description"
   ```
2. Push to GitHub:
   ```bash
   git push
   ```
3. Render will automatically redeploy (if Auto-Deploy is on) or you can manually trigger it in the Render Dashboard.
### 4. Deploying the Backend (Required for AI Search)
Since v1.1, the project requires a Python Backend. You likely only have the Frontend deployed.

**Option A: The Easy Way (Blueprints)**
1. In Render Dashboard, click **New +** -> **Blueprint**.
2. Connect your GitHub repository.
3. It will detect `render.yaml` and propose creating two services:
   - `rnd-map-backend` (Python)
   - `rnd-map-frontend` (Static)
4. Click **Apply**.

**Option B: Manual Setup**
If you want to add the backend manually:
1. **New +** -> **Web Service**.
2. Connect repo.
3. Name: `rnd-map-backend`.
4. Runtime: **Python 3**.
5. Build Command: `pip install -r fastapi_server/requirements.txt`
6. Start Command: `uvicorn fastapi_server.main:app --host 0.0.0.0 --port $PORT`
7. Environment Variables:
   - `PYTHON_VERSION`: `3.9.18`
   - `OPENROUTER_API_KEY`: (Your key)

**Connecting Frontend to Backend**:
- Go to your **Frontend** service -> Environment.
- Add `VITE_API_URL` with the URL of your new Backend service.
