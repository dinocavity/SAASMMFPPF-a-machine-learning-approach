#!/usr/bin/env sh
set -e

echo "Starting frontend build watch (outputs to /app/extension)..."
cd /app/frontend
npm install

# Clean previous build output (keep tesseract and any manual files like manifest.json)
rm -rf /app/extension/assets /app/extension/index.html

mkdir -p /app/extension/tesseract
cp /app/frontend/node_modules/tesseract.js/dist/worker.min.js /app/extension/tesseract/
cp /app/frontend/node_modules/tesseract.js-core/tesseract-core.wasm.js /app/extension/tesseract/
cp /app/frontend/node_modules/tesseract.js-core/tesseract-core.wasm /app/extension/tesseract/

npm run build:watch
