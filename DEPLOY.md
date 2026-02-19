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
### 4. Configure Environment Variables (Crucial for AI Search)
Go to your Render Dashboard -> **Environment** tab:
1. Add `VITE_API_URL`:
   - Value: The URL of your **FastAPI Backend** service (e.g., `https://rnd-map-backend.onrender.com`).
   - If frontend and backend are on the same domain/service, you might not need this, but usually they are separate.
2. Ensure the Backend service has `OPENROUTER_API_KEY` set.

### 5. Redeploy
After setting the variables, trigger a manual deploy if it doesn't happen automatically.
