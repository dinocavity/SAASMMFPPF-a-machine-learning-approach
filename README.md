# SAASMMFPPF-a-machine-learning-approach

SENTIMENT ANALYSIS AND SOCIAL MEDIA MONITORING FOR PREVENTING PURCHASE FRAUD: A MACHINE LEARNING APPROACH.
This project analyzes public review text with sentiment and authenticity models,
then combines OCR and structured signals to flag purchase-fraud risk.

## Environment
Copy `.env.example` to `.env` and adjust values for your setup. For local runs,
export the variables in your shell (examples below). Docker uses the defaults in
`docker-compose.yml`. The backend also auto-loads `.env` via `python-dotenv`.

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
- Connection string: `postgresql://postgres:postgres@localhost:5433/SAASMMFPPF`
- psql inside the container:
```bash
docker-compose exec db psql -U postgres -d SAASMMFPPF
```
- psql from your host (if installed):
```bash
psql "postgresql://postgres:postgres@localhost:5433/SAASMMFPPF"
```

### Build Extension (Docker)
```bash
docker-compose exec app sh /app/scripts/build-extension.sh
```

### Dev Watch (Docker, no rebuilds)
Once containers are running, code changes hot-reload automatically for the API
and the Vite dev server. For the extension UI, run a watch build that writes
directly into `extension/`:
```bash
docker-compose exec app sh /app/scripts/dev-watch.sh
```
Then reload the extension in `chrome://extensions`.

## Run Without Docker (Local)
Prereqs: Node 18+, Python 3.9+, Postgres 14+

Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
set DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/SAASMMFPPF
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

2) The build outputs directly into `extension/` (no manual copy needed).

Tip: use watch mode during development to avoid rebuilding every time:
```bash
cd frontend
npm run build:watch
```
Reload the extension in `chrome://extensions` after each rebuild.

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
  "permissions": ["sidePanel", "storage", "tabs", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>", "http://localhost:8000/*"]
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

## Analyze Reviews Flow
User opens a product page (Shopee / Lazada / etc.), then clicks **Analyze Reviews** in the side panel:
1. Extension scrolls to the review section.
2. (Optional) Paginate reviews from the toggle, pausing after each page if enabled.
3. Captures screenshots of the visible review area.
4. Extracts text via OCR.
5. Runs fraud detection and sentiment analysis automatically.

No manual screenshot. No scraping. No ToS violation.

## Evaluate Models
Use `/evaluate` to compare API vs custom sentiment models and score the authenticity classifier.
Request body:
```json
{
  "samples": [
    {
      "text": "Great quality and fast shipping!",
      "sentiment_label": "positive",
      "authenticity_label": "authentic"
    }
  ]
}
```
Response includes accuracy, precision, recall, F1, ROC-AUC (when possible), and a confusion matrix for:
- `sentiment_api`
- `sentiment_custom`
- `authenticity`

## Limitations
1. Screenshot quality affects OCR accuracy.
2. Authenticity detection is probabilistic.
3. Limited training data impacts performance.
4. Results are platform-agnostic.
5. OCR struggles with stylized fonts, glare, and low contrast.
6. API sentiment requires connectivity and may throttle or time out.
7. Heuristic linguistic signals can misfire on short or slang-heavy reviews.
8. Models are tuned for English and may degrade on mixed languages.
9. Evaluation metrics only reflect the quality of labeled samples provided.
