# Deployment Guide

## 1. GitHub
To publish the code:
1. Create a new repository on GitHub (e.g. `rnd-map-moscow`).
2. Run these commands in your terminal:
   ```bash
   git remote add origin https://github.com/Start-up-creation-MIPT-F24/rnd-map-moscow.git
   git branch -M main
   git push -u origin main
   ```
   *(Replace with your actual repo URL)*

## 2. Render (Static Site)
To publish the map online:
1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Static Site**.
3. Connect your GitHub repository.
4. Settings:
   - **Build Command**: `cd app && npm install && npm run build`
   - **Publish Directory**: `app/dist`
5. Click **Deploy**.

## Alternative: GitHub Pages
1. In your GitHub repo settings -> **Pages**.
2. Source: `GitHub Actions`.
3. Use the "Static HTML" workflow.
