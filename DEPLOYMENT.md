# Deployment Guide

## 1. Overview

SAASMMFPPF consists of three deployable components:

1. **Backend API** — A FastAPI server that runs six ML models (3 sentiment, 3 fraud-detection) and exposes a REST API on port 8000.
2. **PostgreSQL Database** — Stores user accounts and authentication data.
3. **Chrome Extension** — A Manifest V3 side-panel extension that scrapes reviews from Shopee/Lazada and sends them to the backend for analysis.

A Vite-based React frontend is built and bundled **into** the extension (it serves as the extension's UI).

---

## 2. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| Python | 3.11+ |
| PostgreSQL | 14+ |
| Docker & Docker Compose | Latest stable (for containerized deploy) |
| Chrome / Chromium | Latest stable (for the extension) |

> **Note:** The first time the backend starts it downloads ~1.5 GB of RoBERTa model weights from HuggingFace. Ensure you have adequate disk space and a stable internet connection.

---

## 3. Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://postgres:postgres@localhost:5433/SAASMMFPPF` | Yes | PostgreSQL connection string. When running inside Docker the host should be `db` instead of `localhost`, and port should be `5432`. |
| `JWT_SECRET` | `change-this-secret` | Yes | Secret key used to sign JWT tokens. **Must** be changed for production. |
| `SUPERADMIN_USERNAME` | `superadmin` | Yes | Username for the auto-created superadmin account. |
| `SUPERADMIN_PASSWORD` | `superadmin123` | Yes | Password for the superadmin account. **Must** be changed for production. |
| `CORS_ORIGINS` | `http://localhost:5173` | Yes | Comma-separated list of allowed origins. Set to the extension's origin in production. |
| `HUGGINGFACE_TOKEN` | *(empty)* | No | HuggingFace API token. Required only for the HuggingFace API-based models; local models work without it. |
| `HUGGINGFACE_API_URL` | `https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english` | No | HuggingFace inference API endpoint. |
| `VITE_API_URL` | `http://localhost:8000` | Yes | Backend URL used by the frontend at build time. Must be set **before** building the frontend/extension. |
| `VITE_TESSERACT_BASE_URL` | `/tesseract` | No | Base URL for Tesseract.js worker/WASM files. |
| `VITE_TESSERACT_LANG_PATH` | `https://tessdata.projectnaptha.com/4.0.0` | No | URL for Tesseract language data files. |

---

## 4. Deploy with Docker (Recommended)

### Start all services

```bash
docker compose up -d --build
```

This brings up:

- **Postgres 15** on host port **5433** (mapped from container port 5432)
- **Backend API** (uvicorn with `--reload`) on port **8000**
- **Frontend dev server** (Vite) on port **5173**

The backend installs all pip dependencies (including `transformers` and `torch`) during the Docker image build. On first run, model weights are downloaded automatically.

### Default credentials

| | Value |
|---|---|
| Postgres user | `postgres` |
| Postgres password | `postgres` |
| Postgres database | `SAASMMFPPF` |
| Superadmin username | `superadmin` |
| Superadmin password | `superadmin123` |

### Verify

```bash
# Backend health check
curl http://localhost:8000/docs

# Frontend
open http://localhost:5173
```

### Rebuild after dependency changes

If you add new pip or npm packages:

```bash
docker compose build --no-cache app
docker compose up -d
```

### Stop

```bash
docker compose down          # stop containers, keep data
docker compose down -v       # stop containers and delete postgres volume
```

---

## 5. Deploy without Docker (Local / Manual)

### 5.1 Start PostgreSQL

Start a local Postgres instance and create the database:

```bash
psql -U postgres -c "CREATE DATABASE \"SAASMMFPPF\";"
```

The default `.env.example` expects Postgres on port **5433**. Adjust `DATABASE_URL` if your instance runs on a different port.

### 5.2 Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (or use a .env file in the backend directory)
# On Linux/macOS:
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5433/SAASMMFPPF"
export JWT_SECRET="change-this-secret"
export SUPERADMIN_USERNAME="superadmin"
export SUPERADMIN_PASSWORD="superadmin123"
export CORS_ORIGINS="http://localhost:5173"

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

On startup, SQLAlchemy runs `Base.metadata.create_all()` to create all required tables automatically.

### 5.3 Frontend (dev server)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173`.

---

## 6. Deploy the Chrome Extension

### 6.1 Development (Unpacked)

1. **Build the frontend** so the extension has its bundled UI:

   ```bash
   cd frontend
   npm run build
   ```

   The build output goes into `extension/` (configured by Vite).

2. **Copy Tesseract.js files** from `node_modules` into the extension:

   ```bash
   mkdir -p extension/tesseract
   cp node_modules/tesseract.js/dist/worker.min.js extension/tesseract/
   cp node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js extension/tesseract/
   ```

3. **Load the extension in Chrome:**
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked** and select the `extension/` folder

4. **Watch mode** for iterative development:

   ```bash
   cd frontend
   npm run build:watch
   ```

   After each rebuild, click the reload button on the extension card in `chrome://extensions`.

### 6.2 Production (Packed .zip / Chrome Web Store)

1. **Set production env vars before building:**

   ```bash
   VITE_API_URL=https://your-production-api.example.com npm run build
   ```

2. **Update `extension/manifest.json`:**

   - In `host_permissions`, replace `http://localhost:8000/*` with your production API URL (e.g., `https://your-production-api.example.com/*`).
   - In `content_security_policy` → `extension_pages`, update the `connect-src` directive: replace `http://localhost:8000` with your production API URL.

3. **Zip the extension folder:**

   ```bash
   cd extension
   zip -r ../saasmmfppf-extension.zip .
   ```

4. **Upload to Chrome Web Store:**
   - Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Create a new item, upload the `.zip` file
   - Fill in the listing details and submit for review

---

## 7. Production Considerations

- **`JWT_SECRET`** — Change to a strong random value (e.g., `openssl rand -hex 32`).
- **`SUPERADMIN_PASSWORD`** — Change from the default `superadmin123` to a strong password.
- **`CORS_ORIGINS`** — Set to the actual extension origin (e.g., `chrome-extension://<extension-id>`). Remove `http://localhost:5173`.
- **`HUGGINGFACE_TOKEN`** — Set a valid token if you want the HuggingFace API-based models to work. Local models function without it.
- **`manifest.json`** — Update `host_permissions` and CSP `connect-src` to point to your production backend URL instead of `localhost:8000`.
- **`VITE_API_URL`** — Must be set to the production backend URL **before** building the frontend.
- **Torch CPU-only** — To reduce the Docker image size, install the CPU-only variant of PyTorch:
  ```
  pip install torch --index-url https://download.pytorch.org/whl/cpu
  ```
- **Reverse proxy** — Consider placing nginx or Caddy in front of uvicorn for TLS termination, rate limiting, and static file serving in production. Remove the `--reload` flag from the uvicorn command.

---

## 8. Recommended Production Stack

Below is the recommended set of services for a production deployment:

| Component | Service | Notes |
|---|---|---|
| **Backend API** | [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform) or [Render](https://render.com) | Needs a plan with at least 2 GB RAM to load PyTorch + RoBERTa models. Render has a free tier but it sleeps after inactivity and only provides 512 MB RAM — not enough for the ML models. |
| **Database** | [Supabase](https://supabase.com) (free tier) | The free tier provides a PostgreSQL database with 500 MB storage — more than enough for user/auth data. Set `DATABASE_URL` to the connection string from your Supabase project dashboard (Settings → Database → Connection string → URI). |
| **Chrome Extension** | [Chrome Web Store](https://chrome.google.com/webstore/devconsole) | One-time developer registration fee. After that, publishing and updates are free. |
| **HuggingFace API** | [HuggingFace Inference API](https://huggingface.co/inference-api) (free tier) | The free tier is rate-limited but sufficient for moderate usage. Sign up, generate an access token, and set `HUGGINGFACE_TOKEN` in your env vars. |
| **Domain + SSL** | Optional | Not required. Both DigitalOcean and Render provide free subdomains with HTTPS included. Purchase a custom domain only if you want branded URLs. |

### 8.1 Setting Up Supabase (Database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Settings → Database → Connection string** and copy the URI (select "URI" tab).
3. Set `DATABASE_URL` to that connection string in your backend environment. It will look like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. SQLAlchemy creates all tables automatically on first backend startup.

### 8.2 Setting Up the Backend on DigitalOcean or Render

**DigitalOcean App Platform:**
1. Connect your GitHub repo.
2. Set the source directory to `backend/`.
3. Set the run command to `uvicorn main:app --host 0.0.0.0 --port 8000`.
4. Add all required environment variables (see Section 3). Point `DATABASE_URL` to your Supabase connection string.
5. Choose a plan with at least 2 GB RAM.

**Render:**
1. Create a new **Web Service** and connect your GitHub repo.
2. Set the root directory to `backend/`.
3. Set the build command to `pip install -r requirements.txt`.
4. Set the start command to `uvicorn main:app --host 0.0.0.0 --port 8000`.
5. Add all required environment variables. Point `DATABASE_URL` to your Supabase connection string.
6. Choose a plan with at least 2 GB RAM.

For both platforms, after the backend is live, update `VITE_API_URL` to the backend's public URL before building the frontend/extension.

### 8.3 Setting Up HuggingFace API (Free Tier)

1. Create an account at [huggingface.co](https://huggingface.co).
2. Go to **Settings → Access Tokens** and create a new token with `read` scope.
3. Set `HUGGINGFACE_TOKEN` in your backend environment variables.
4. The free Inference API is rate-limited. If you hit limits, the API-based models will return errors but the local models will continue working normally.

---

## 9. Updating After Code Changes

| Change type | What to do |
|---|---|
| Backend Python code | Hot-reloaded automatically when using `--reload` flag or Docker volumes (already configured in `docker-compose.yml`). |
| New pip dependencies | Requires a Docker rebuild: `docker compose build --no-cache app && docker compose up -d`. For manual installs, run `pip install -r requirements.txt` again. |
| Frontend / extension UI | Rebuild the frontend (`npm run build`), then reload the extension in `chrome://extensions`. |
| Database schema changes | Handled automatically by SQLAlchemy `Base.metadata.create_all()` on backend startup. This creates new tables but does **not** alter existing columns — use Alembic migrations for column-level changes. |
