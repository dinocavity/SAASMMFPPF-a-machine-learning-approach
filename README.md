# SAASMMFPPF-a-machine-learning-approach

OVERVIEW: WHAT WE'RE BUILDING LOCALLY
- Chrome extension (side panel) client UI
- FastAPI backend (API-based)
- Two sentiment models (API + custom)
- One authenticity model
- OCR on client (no scraping)
- Postgres for users + auth

This repo currently runs the UI as a local web app, with client-side OCR and a
FastAPI backend that requires a superadmin login. It is the same workflow intended
for the side-panel extension.

Meaning: SENTIMENT ANALYSIS AND SOCIAL MEDIA MONITORING FOR PREVENTING PURCHASE FRAUD: A MACHINE LEARNING APPROACH.
 
Note: This UI is designed to become a Chrome side-panel extension; keep layouts
compact and panel-friendly.

## Quick Run (Docker)
```bash
docker-compose up -d --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs

Default credentials:
- Username: `superadmin`
- Password: `superadmin123`

## Run Without Docker (Local)
Prereqs: Node 18+, Python 3.9+, Postgres 14+

Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
set DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/SAASMMFPPF
set JWT_SECRET=change-this-secret
set SUPERADMIN_USERNAME=superadmin
set SUPERADMIN_PASSWORD=superadmin123
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Chrome Side Panel Extension Setup (Local)
This repo does not ship a full extension scaffold yet. You can wire the UI into
a local side-panel extension with these steps:

1) Build the frontend:
```bash
cd frontend
npm install
npm run build
```

2) Create an `extension/` folder and copy `frontend/dist/*` into it.

3) Add `extension/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "SAASMMFPPF-a-machine-learning-approach",
  "version": "0.1.0",
  "description": "Side panel UI for review OCR + analysis",
  "action": {
    "default_title": "SAASMMFPPF"
  },
  "side_panel": {
    "default_path": "index.html"
  },
  "permissions": ["sidePanel", "storage"],
  "host_permissions": ["http://localhost:8000/*"]
}
```

4) Load it in Chrome:
`chrome://extensions` -> Enable Developer Mode -> Load unpacked -> select `extension/`.

If you change the API URL, update `host_permissions` and `VITE_API_URL` before
building the frontend.

Optional (Docker build step):
```bash
docker-compose exec app sh /app/scripts/build-extension.sh
```

OCR language data defaults to `https://tessdata.projectnaptha.com/4.0.0`. To run
fully offline, place `eng.traineddata.gz` in `extension/tesseract/lang-data/` and
set `VITE_TESSERACT_LANG_PATH=/tesseract/lang-data` before building.

## Notes
- OCR runs locally in the browser via `tesseract.js`.
- `/analyze` requires a bearer token from `/auth/login`.
- Postgres is required for the superadmin user store.
- Optional: set `HUGGINGFACE_TOKEN` to use the hosted sentiment API model; otherwise a lightweight fallback runs.
