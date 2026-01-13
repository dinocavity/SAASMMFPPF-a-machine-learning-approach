# Shopee Review Analyzer (MVP)

A Chrome side-panel extension that performs sentiment analysis and
review authenticity checks using screenshots of Shopee reviews.

## Features
- Screenshot-based OCR (no scraping)
- AI sentiment analysis
- Fake-review indicator detection
- Fully client-side MVP
- Free & legal deployment

## Tech Stack
- Chrome Extension (Manifest V3)
- Tesseract.js (OCR)
- HuggingFace Inference API
- JavaScript

## How to Run
1. Clone this repo
2. Go to chrome://extensions
3. Enable Developer Mode
4. Load Unpacked → select `extension/`
5. Open a Shopee product page
6. Open the side panel and upload a review screenshot

## Disclaimer
This project analyzes user-provided screenshots only.
Not affiliated with Shopee.
