import re

from transformers import pipeline

_classifier = pipeline(
    "text-classification",
    model="textattack/roberta-base-SST-2",
    top_k=None,
)

PROMO_PHRASES = {
    "highly recommended",
    "best ever",
    "must buy",
    "life changing",
    "five stars",
    "perfect product",
}

HEURISTIC_WEIGHTS = {
    "exclamation_ratio": 0.25,
    "caps_ratio": 0.20,
    "repeated_chars": 0.20,
    "short_review": 0.20,
    "promo_phrases": 0.15,
}

DECISION_THRESHOLD = 0.6
BLEND_WEIGHTS = {"model": 0.7, "heuristic": 0.3}


def _heuristic_breakdown(text: str) -> dict:
    lowered = text.lower()
    length = max(len(text), 1)
    exclamations = text.count("!")
    caps = sum(1 for c in text if c.isupper())
    repeated_chars = len(re.findall(r"(.)\1{2,}", text))
    promo_hits = sum(phrase in lowered for phrase in PROMO_PHRASES)

    components = {
        "exclamation_ratio": {
            "value": min(exclamations / 5.0, 1.0),
            "weight": HEURISTIC_WEIGHTS["exclamation_ratio"],
            "raw": exclamations,
        },
        "caps_ratio": {
            "value": min(caps / max(length, 1), 1.0),
            "weight": HEURISTIC_WEIGHTS["caps_ratio"],
            "raw": caps,
        },
        "repeated_chars": {
            "value": min(repeated_chars / 3.0, 1.0),
            "weight": HEURISTIC_WEIGHTS["repeated_chars"],
            "raw": repeated_chars,
        },
        "short_review": {
            "value": 1.0 if length < 40 else 0.0,
            "weight": HEURISTIC_WEIGHTS["short_review"],
            "raw": length,
        },
        "promo_phrases": {
            "value": min(promo_hits / 2.0, 1.0),
            "weight": HEURISTIC_WEIGHTS["promo_phrases"],
            "raw": promo_hits,
        },
    }

    score = sum(c["value"] * c["weight"] for c in components.values())
    score = max(0.0, min(score, 1.0))

    return {"components": components, "score": score}


def analyze_fraud(text):
    # RoBERTa inference
    raw_scores = _classifier(text[:512])[0]
    raw_model_scores = {item["label"]: round(item["score"], 4) for item in raw_scores}

    # RoBERTa SST-2: LABEL_1 = positive sentiment ≈ "genuine", LABEL_0 = negative ≈ "suspicious"
    # For fraud detection we treat negative sentiment as higher fraud probability
    model_prob = raw_model_scores.get("LABEL_0", 0.0)

    # Heuristic analysis
    heuristic = _heuristic_breakdown(text)
    heuristic_prob = heuristic["score"]

    combined = BLEND_WEIGHTS["model"] * model_prob + BLEND_WEIGHTS["heuristic"] * heuristic_prob

    signals = []
    if heuristic_prob > 0.4:
        signals.append("linguistic-patterns")

    return {
        "is_fake": combined > DECISION_THRESHOLD,
        "confidence": float(combined),
        "model_name": "RoBERTa",
        "model_confidence": float(model_prob),
        "heuristic_confidence": float(heuristic_prob),
        "signals": signals,
        "heuristic_breakdown": heuristic["components"],
        "decision_threshold": DECISION_THRESHOLD,
        "blend_weights": BLEND_WEIGHTS,
        "raw_model_scores": raw_model_scores,
    }
