# Quick Start

## Docker (Recommended)
```bash
docker-compose up -d --build
```
- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs

Default login:
- `superadmin`
- `superadmin123`

## Local (No Docker)

1) Start Postgres locally and create a database named `SAASMMFPPF`.

2) Backend:
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

3) Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the superadmin credentials.

## Side Panel Extension (Local)
1) Build the frontend:
```bash
cd frontend
npm install
npm run build
```

2) Create `extension/` and copy `frontend/dist/*` into it.

3) Add `extension/manifest.json`:
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

4) `chrome://extensions` -> Developer Mode -> Load unpacked -> select `extension/`.

Optional (Docker build step):
```bash
docker-compose exec app sh /app/scripts/build-extension.sh
```

## Docker Dev Watch (No Rebuilds)
When containers are already running, backend and frontend hot-reload on changes.
To keep the extension UI updated without rebuilding the image:
```bash
docker-compose exec app sh /app/scripts/dev-watch.sh
```
Reload the extension in `chrome://extensions` after changes.
