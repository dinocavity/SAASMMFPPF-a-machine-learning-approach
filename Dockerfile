FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY frontend/package.json /app/frontend/package.json
RUN cd /app/frontend && npm install

COPY backend /app/backend
COPY frontend /app/frontend

CMD sh -c "cd /app/backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload & cd /app/frontend && npm run dev -- --host 0.0.0.0 --port 5173"
