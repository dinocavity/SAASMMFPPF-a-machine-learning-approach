import logging
import os
from typing import Dict, Union

import requests

logger = logging.getLogger(__name__)

HF_MODEL = os.getenv(
    "HUGGINGFACE_API_URL",
    "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
)
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")

POSITIVE_HINTS = {"great", "amazing", "excellent", "love", "perfect", "recommend", "good"}
NEGATIVE_HINTS = {"bad", "terrible", "awful", "hate", "broken", "worst", "poor"}


def _fallback_sentiment(text: str) -> Dict[str, Union[float, str]]:
    lowered = text.lower()
    pos_hits = [word for word in POSITIVE_HINTS if word in lowered]
    neg_hits = [word for word in NEGATIVE_HINTS if word in lowered]

    if len(pos_hits) == len(neg_hits):
        return {
            "sentiment": "neutral",
            "confidence": 0.5,
            "model_name": "HuggingFace API",
            "is_fallback": True,
            "keyword_matches": {"positive_keywords": pos_hits, "negative_keywords": neg_hits},
        }

    sentiment = "positive" if len(pos_hits) > len(neg_hits) else "negative"
    confidence = 0.5 + (abs(len(pos_hits) - len(neg_hits)) * 0.1)

    return {
        "sentiment": sentiment,
        "confidence": min(confidence, 0.95),
        "model_name": "HuggingFace API",
        "is_fallback": True,
        "keyword_matches": {"positive_keywords": pos_hits, "negative_keywords": neg_hits},
    }


def analyze_sentiment_api(text: str):
    if not HF_TOKEN:
        return _fallback_sentiment(text)

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    try:
        response = requests.post(HF_MODEL, headers=headers, json={"inputs": text}, timeout=15)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, list) and data:
            results = data[0] if isinstance(data[0], list) else data
            raw_api_scores = {item["label"]: round(item["score"], 4) for item in results}

            best = max(results, key=lambda x: x["score"])
            label = best.get("label", "").lower()
            score = float(best.get("score", 0.0))
            sentiment = "positive" if "pos" in label else "negative"

            return {
                "sentiment": sentiment,
                "confidence": score,
                "model_name": "HuggingFace API",
                "is_fallback": False,
                "raw_api_scores": raw_api_scores,
            }
    except requests.exceptions.Timeout:
        logger.warning("HuggingFace API timeout for sentiment analysis, using fallback")
    except requests.exceptions.RequestException as e:
        logger.warning(f"HuggingFace API request failed for sentiment analysis: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in sentiment API: {e}", exc_info=True)

    return _fallback_sentiment(text)
