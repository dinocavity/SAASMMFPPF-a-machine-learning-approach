#!/usr/bin/env sh
set -e

echo "Starting frontend build watch (outputs to /app/extension)..."
cd /app/frontend
npm run build:watch
