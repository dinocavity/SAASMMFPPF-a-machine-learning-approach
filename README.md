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

## How the Models Work

The system runs **6 ML models in parallel** — 3 for fraud detection and 3 for sentiment analysis. Each model produces an independent result, and a consensus algorithm combines them into a final verdict. If individual models fail, the system falls back to keyword heuristics so it always returns a result.

| # | Group | Model | Type | Neutral? |
|---|-------|-------|------|----------|
| 1 | Fraud | HuggingFace API (RoBERTa SST-2) | Remote API | No |
| 2 | Fraud | Local RoBERTa Transformer | Local transformer + heuristic blend | No |
| 3 | Fraud | Random Forest (TF-IDF) | Pre-trained sklearn | No |
| 4 | Sentiment | HuggingFace API (DistilBERT) | Remote API | No |
| 5 | Sentiment | Local RoBERTa (Twitter) | Local transformer | Yes |
| 6 | Sentiment | SVM (TF-IDF) | Pre-trained sklearn | No |

### Fraud Detection Models

#### Model 1: HuggingFace API — RoBERTa SST-2

**Source:** `fraud_hf_roberta.py` | **Requires:** `HUGGINGFACE_TOKEN` env var

- Sends the review text to the `textattack/roberta-base-SST-2` model via the HuggingFace Inference API
- Receives two scores: LABEL_0 (negative sentiment) and LABEL_1 (positive sentiment)
- Uses the **positive sentiment score (LABEL_1) as fraud confidence** — the rationale is that overly positive reviews are suspicious
- Decision: LABEL_1 score > 0.6 threshold → flagged as fraudulent

**Fallback** (when API is unavailable or no token is set):
- Starts with a baseline score of 0.5
- Scans for fake hint phrases ("best ever", "must buy", "life changing", etc.) — each adds +0.12
- Scans for genuine hint phrases ("okay", "average", "broke", etc.) — each subtracts −0.12
- Adds exclamation bonus: `min(count / 10, 0.15)`
- Short text penalty: +0.1 if under 30 characters
- Clamps final score to 0.0–1.0, applies the same 0.6 threshold

#### Model 2: Local RoBERTa Transformer

**Source:** `fraud_local_roberta.py` | **No API dependency**

- Runs the same `textattack/roberta-base-SST-2` model locally via HuggingFace Transformers
- Truncates input to **512 tokens** (RoBERTa's max context)
- Uses the **negative sentiment score (LABEL_0) as fraud probability** — treats negative sentiment as suspicious
- **Blended scoring:** final score = `0.7 × model probability + 0.3 × heuristic score`

**Heuristic components** (weighted sum, each normalized to 0.0–1.0):

| Signal | Weight | How it's calculated |
|--------|--------|---------------------|
| Exclamation ratio | 0.25 | `min(count / 5, 1.0)` |
| Caps ratio | 0.20 | Uppercase chars / total length |
| Repeated characters | 0.20 | Patterns like "loveeeee" — `min(matches / 3, 1.0)` |
| Short review | 0.20 | 1.0 if < 40 chars, else 0.0 |
| Promotional phrases | 0.15 | Matches against "highly recommended", "best ever", etc. |

- Decision: blended score > 0.6 threshold → flagged as fraudulent
- Returns full breakdown of model confidence, heuristic confidence, and per-signal values

#### Model 3: Random Forest on TF-IDF

**Source:** `fraud_random_forest.py` | **Pre-trained:** `models/fraud_random_forest.pkl`

- Loads a pre-trained sklearn Random Forest classifier and TF-IDF vectorizer from `.pkl` files
- Converts the review text into a TF-IDF feature vector
- Runs `predict_proba` — the probability of class 1 (fraudulent) is used as confidence
- Decision: probability > 0.6 threshold → flagged as fraudulent
- Returns the **top 10 contributing features** with each word's TF-IDF score, tree importance, and contribution (TF-IDF × importance)

### Sentiment Analysis Models

#### Model 4: HuggingFace API — DistilBERT

**Source:** `sentiment_hf_distilbert.py` | **Requires:** `HUGGINGFACE_TOKEN` env var

- Sends the review text to `distilbert-base-uncased-finetuned-sst-2-english` via the HuggingFace Inference API
- Binary classification: **positive** or **negative** (no neutral class)
- The highest-scoring label becomes the sentiment; its score becomes the confidence

**Fallback** (when API is unavailable or no token is set):
- Counts positive keyword matches ("great", "amazing", "excellent", "love", etc.)
- Counts negative keyword matches ("bad", "terrible", "awful", "hate", etc.)
- If counts are equal → neutral with 0.5 confidence
- Otherwise: confidence = `0.5 + (difference × 0.1)`, capped at 0.95

#### Model 5: Local RoBERTa (Twitter-trained)

**Source:** `sentiment_local_roberta.py` | **No API dependency**

- Runs `cardiffnlp/twitter-roberta-base-sentiment-latest` locally via HuggingFace Transformers
- **Only model that outputs 3 classes:** positive, negative, and neutral
- Truncates input to **512 tokens**
- Returns the full class probability distribution (e.g., `{"positive": 0.82, "negative": 0.05, "neutral": 0.13}`)
- The highest-scoring class becomes the final sentiment label

#### Model 6: SVM on TF-IDF

**Source:** `sentiment_svm.py` | **Pre-trained:** `models/sentiment_svm.pkl`

- Loads a pre-trained sklearn Linear SVM classifier and TF-IDF vectorizer from `.pkl` files
- Binary classification: **positive** or **negative** (no neutral class)
- Runs `predict_proba` — the highest class probability is used as confidence
- Returns the **top 10 contributing features** with each word's TF-IDF score, SVM coefficient, and contribution (TF-IDF × coefficient)

### Consensus Algorithm

After all enabled models return their results, the system computes a consensus for each group:

**Fraud consensus:**
1. Collects results from all models that ran successfully (status = "ok")
2. **Average confidence** = mean of all individual fraud confidence scores
3. **Majority vote** on `is_fake` — if more than 50% of models say fake, the consensus is fake
4. If all models fail → heuristic keyword fallback provides a degraded result

**Sentiment consensus:**
1. Collects results from all models that ran successfully (status = "ok")
2. **Average confidence** = mean of all individual sentiment confidence scores
3. **Most common label** via majority vote (`Counter.most_common`) — handles ties by picking the first
4. If all models fail → heuristic keyword fallback provides a degraded result

**Disabled models** are excluded entirely from consensus — they are not counted as successes or failures. At least 1 fraud model and 1 sentiment model must remain enabled.

### Global Configuration

All thresholds are centralized in `config.py`:

| Setting | Default | Env var | Purpose |
|---------|---------|---------|---------|
| Fraud decision threshold | 0.6 | `FRAUD_THRESHOLD` | Score above this → fraudulent |
| Blend weights (local RoBERTa) | model 70%, heuristic 30% | — | How model and heuristic scores are mixed |
| Max text length | 50,000 chars | `MAX_TEXT_LENGTH` | Input validation limit |
| Min text length | 3 chars | — | Minimum for meaningful analysis |
| Rate limit | 60 req/min/IP | `RATE_LIMIT_RPM` | Per-IP throttle on /analyze and /evaluate |

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
