import os
from typing import Dict, Union

import requests

HF_MODEL = os.getenv(
    "HUGGINGFACE_API_URL",
    "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
)
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")

POSITIVE_HINTS = {"great", "amazing", "excellent", "love", "perfect", "recommend", "good"}
NEGATIVE_HINTS = {"bad", "terrible", "awful", "hate", "broken", "worst", "poor"}


def _fallback_sentiment(text: str) -> Dict[str, Union[float, str]]:
    lowered = text.lower()
    pos_hits = sum(word in lowered for word in POSITIVE_HINTS)
    neg_hits = sum(word in lowered for word in NEGATIVE_HINTS)
    if pos_hits == neg_hits:
        return {"sentiment": "neutral", "confidence": 0.5}
    sentiment = "positive" if pos_hits > neg_hits else "negative"
    confidence = 0.5 + (abs(pos_hits - neg_hits) * 0.1)
    return {"sentiment": sentiment, "confidence": min(confidence, 0.95)}


def analyze_sentiment_api(text: str):
    if not HF_TOKEN:
        return _fallback_sentiment(text)

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    response = requests.post(HF_MODEL, headers=headers, json={"inputs": text}, timeout=15)
    response.raise_for_status()
    data = response.json()

    if isinstance(data, list) and data:
        label = data[0].get("label", "").lower()
        score = float(data[0].get("score", 0.0))
        sentiment = "positive" if "pos" in label else "negative"
        return {"sentiment": sentiment, "confidence": score}

    return _fallback_sentiment(text)
