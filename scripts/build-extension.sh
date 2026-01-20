#!/bin/sh
set -e

cd /app/frontend
npm install
npm run build

mkdir -p /app/extension
rm -rf /app/extension/assets /app/extension/index.html
cp -r /app/frontend/dist/* /app/extension/

mkdir -p /app/extension/tesseract
cp /app/frontend/node_modules/tesseract.js/dist/worker.min.js /app/extension/tesseract/
cp /app/frontend/node_modules/tesseract.js-core/tesseract-core.wasm.js /app/extension/tesseract/
cp /app/frontend/node_modules/tesseract.js-core/tesseract-core.wasm /app/extension/tesseract/
