# Development Guide

## Project Structure
```
backend/   FastAPI API, ML models, auth, Postgres
frontend/  React + shadcn UI, OCR in browser
```

## Environment Variables
Backend:
- `DATABASE_URL` (default: `postgresql+psycopg2://postgres:postgres@db:5432/SAASMMFPPF`)
- `JWT_SECRET`
- `SUPERADMIN_USERNAME`
- `SUPERADMIN_PASSWORD`
- `CORS_ORIGINS` (comma-separated)
- `HUGGINGFACE_TOKEN` (optional for API-based sentiment)

Frontend:
- `VITE_API_URL` (default: `http://localhost:8000`)

## Auth Flow
1) POST `/auth/login` with form data (username/password)
2) Receive bearer token
3) Send `Authorization: Bearer <token>` to `/analyze`

## OCR Workflow
OCR is client-side using `tesseract.js`. The screenshot never leaves the browser;
only extracted text is sent to the API.

## Extension Note
The frontend is intended to run inside a Chrome side-panel extension, so keep
components narrow and optimized for vertical layouts.

## Extension Setup (Manual)
To wire the UI into a Chrome side panel locally:

1) Build the frontend: `npm run build` in `frontend/`.
2) Build output writes directly into `extension/` (no manual copy needed).
3) Add a MV3 manifest with a `side_panel` entry:
```json
{
  "manifest_version": 3,
  "name": "SAASMMFPPF-a-machine-learning-approach",
  "version": "0.1.0",
  "description": "Side panel UI for review OCR + analysis",
  "action": { "default_title": "SAASMMFPPF" },
  "side_panel": { "default_path": "index.html" },
  "permissions": ["sidePanel", "storage"],
  "host_permissions": ["http://localhost:8000/*"]
}
```
4) Load the `extension/` folder via `chrome://extensions` -> Load unpacked.

If you change the API host, update `host_permissions` and rebuild the frontend.

## Local Development Tips
- If Postgres is local, point `DATABASE_URL` to `localhost`.
- If frontend runs inside Docker, use `VITE_API_URL=http://backend:8000`.
- API docs: http://localhost:8000/docs

## Docker Dev Watch (No Rebuilds)
To keep the extension UI synced while editing, run:
```bash
docker-compose exec app sh /app/scripts/dev-watch.sh
```
What it does: installs deps, cleans `/app/extension/assets` and
`/app/extension/index.html`, copies Tesseract assets, then runs
`npm run build:watch` for continuous rebuilds.
Reload the extension in `chrome://extensions` after changes.

## Docker Extension Build (One-Time)
For a production-style build of the extension UI:
```bash
docker-compose exec app sh /app/scripts/build-extension.sh
```
What it does: installs deps, cleans `/app/extension/assets` and
`/app/extension/index.html`, runs `npm run build`, then copies Tesseract assets
into `/app/extension/tesseract`.
