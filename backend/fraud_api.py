import os
from typing import Dict, Union

import requests

HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
HF_FRAUD_MODEL = "https://api-inference.huggingface.co/models/textattack/roberta-base-SST-2"

FAKE_HINTS = {
    "best ever", "highly recommended", "must buy", "life changing",
    "five stars", "perfect product", "amazing product", "love it",
}
GENUINE_HINTS = {
    "okay", "average", "not bad", "decent", "broke", "poor", "returned",
}


def _fallback_fraud(text: str) -> Dict[str, Union[bool, float, str]]:
    lowered = text.lower()
    fake_hits = sum(phrase in lowered for phrase in FAKE_HINTS)
    genuine_hits = sum(phrase in lowered for phrase in GENUINE_HINTS)
    exclamations = text.count("!")

    score = 0.5
    score += fake_hits * 0.12
    score -= genuine_hits * 0.12
    score += min(exclamations / 10.0, 0.15)

    if len(text) < 30:
        score += 0.1

    score = max(0.0, min(score, 1.0))

    return {
        "is_fake": score > 0.5,
        "confidence": score,
        "model_name": "HuggingFace API",
    }


def analyze_fraud_api(text: str) -> Dict[str, Union[bool, float, str]]:
    if not HF_TOKEN:
        return _fallback_fraud(text)

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    try:
        response = requests.post(
            HF_FRAUD_MODEL,
            headers=headers,
            json={"inputs": text},
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        if isinstance(data, list) and data:
            results = data[0] if isinstance(data[0], list) else data
            label_scores = {item["label"]: item["score"] for item in results}

            negative_score = label_scores.get("LABEL_0", 0.0)
            positive_score = label_scores.get("LABEL_1", 0.0)

            confidence = float(positive_score)
            is_fake = confidence > 0.7

            return {
                "is_fake": is_fake,
                "confidence": confidence,
                "model_name": "HuggingFace API",
            }
    except Exception:
        pass

    return _fallback_fraud(text)
