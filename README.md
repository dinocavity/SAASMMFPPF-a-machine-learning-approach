# SAASMMFPPF-a-machine-learning-approach

SENTIMENT ANALYSIS AND SOCIAL MEDIA MONITORING FOR PREVENTING PURCHASE FRAUD: A MACHINE LEARNING APPROACH.
This project analyzes public review text with sentiment and authenticity models,
then combines OCR and structured signals to flag purchase-fraud risk.

## Environment
Copy `.env.example` to `.env` and adjust values for your setup. For local runs,
export the variables in your shell (examples below). Docker uses the defaults in
`docker-compose.yml`.

## Run With Docker
```bash
docker-compose up -d --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs
Note: Docker starts the frontend and backend only; it does not build the extension
unless you run the extension build step below.

Default credentials:
- Username: `superadmin`
- Password: `superadmin123`

### Access Postgres (Docker)
- Connection string: `postgresql://postgres:postgres@localhost:5432/SAASMMFPPF`
- psql inside the container:
```bash
docker-compose exec db psql -U postgres -d SAASMMFPPF
```
- psql from your host (if installed):
```bash
psql "postgresql://postgres:postgres@localhost:5432/SAASMMFPPF"
```

### Build Extension (Docker)
```bash
docker-compose exec app sh /app/scripts/build-extension.sh
```

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

## Build Extension (Local)
The extension folder is included, but the packaged UI files are generated from
the frontend build.

1) Build the frontend:
```bash
cd frontend
npm install
npm run build
```

2) Copy `frontend/dist/*` into `extension/`.

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
If the panel does not appear, click the extension icon and pin it, then open the
side panel from the Chrome toolbar.

If you change the API URL, update `host_permissions` and `VITE_API_URL` before
building the frontend.

OCR language data defaults to `https://tessdata.projectnaptha.com/4.0.0`. To run
fully offline, place `eng.traineddata.gz` in `extension/tesseract/lang-data/` and
set `VITE_TESSERACT_LANG_PATH=/tesseract/lang-data` before building.

## Notes
- OCR runs locally in the browser via `tesseract.js`.
- `/analyze` requires a bearer token from `/auth/login`.
- Postgres is required for the superadmin user store.
- Optional: set `HUGGINGFACE_TOKEN` to use the hosted sentiment API model; otherwise a lightweight fallback runs.
