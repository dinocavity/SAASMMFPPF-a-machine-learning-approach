# SAASMMFPPF-a-machine-learning-approach

SENTIMENT ANALYSIS AND SOCIAL MEDIA MONITORING FOR PREVENTING PURCHASE FRAUD: A MACHINE LEARNING APPROACH.
This extension captures on-page product reviews, extracts text locally with OCR,
and runs multiple fraud and sentiment models to surface a clear, explainable
verdict for shoppers and analysts.

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
What it does: one-time production build of the extension UI. Installs deps,
cleans `/app/extension/assets` and `/app/extension/index.html`, runs
`npm run build`, then copies required Tesseract files into
`/app/extension/tesseract/`.

### Dev Watch (Docker, no rebuilds)
Once containers are running, code changes hot-reload automatically for the API
and the Vite dev server. For the extension UI, run a watch build that writes
directly into `extension/`:
```bash
docker-compose exec app sh /app/scripts/dev-watch.sh
```
What it does: same setup/clean step and Tesseract copy, then runs
`npm run build:watch` for continuous rebuilds while you edit.
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
User opens a product page (Shopee / Lazada / etc.), then clicks **Capture & Analyze Reviews** in the side panel:
1. Extension detects how many review pages exist on the product page.
2. If more than one page is found, a slider lets the user choose how many pages to capture (1 to N).
3. Extension scrolls to the review section and captures screenshots of the visible review area.
4. If multiple pages were selected, the extension clicks through pagination buttons and captures each page in sequence.
5. Extracts text from all captured screenshots via OCR.
6. Runs fraud detection and sentiment analysis automatically across 6 models.

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
- `sentiment_distilbert_api` — HuggingFace API (DistilBERT) sentiment model
- `sentiment_roberta_local` — RoBERTa local sentiment model
- `sentiment_svm` — SVM local sentiment model
- `fraud_roberta_api` — HuggingFace API (RoBERTa) fraud model
- `fraud_roberta_local` — RoBERTa local fraud model
- `fraud_random_forest` — Random Forest local fraud model

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
