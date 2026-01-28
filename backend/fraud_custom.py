import re

import joblib

model = joblib.load("models/fraud_model.pkl")
vectorizer = joblib.load("models/fraud_vectorizer.pkl")

PROMO_PHRASES = {
    "highly recommended",
    "best ever",
    "must buy",
    "life changing",
    "five stars",
    "perfect product",
}


def _heuristic_score(text: str) -> float:
    lowered = text.lower()
    length = max(len(text), 1)
    exclamations = text.count("!")
    question_marks = text.count("?")
    caps = sum(1 for c in text if c.isupper())
    repeated_chars = len(re.findall(r"(.)\1{2,}", text))
    promo_hits = sum(phrase in lowered for phrase in PROMO_PHRASES)

    exclamation_ratio = min(exclamations / 5.0, 1.0)
    caps_ratio = min(caps / max(length, 1), 1.0)
    repeated_ratio = min(repeated_chars / 3.0, 1.0)
    short_review = 1.0 if length < 40 else 0.0

    score = (
        0.25 * exclamation_ratio
        + 0.2 * caps_ratio
        + 0.2 * repeated_ratio
        + 0.2 * short_review
        + 0.15 * min(promo_hits / 2.0, 1.0)
    )
    return max(0.0, min(score, 1.0))


def analyze_fraud(text):
    X = vectorizer.transform([text])
    model_prob = float(model.predict_proba(X)[0][1])
    heuristic_prob = _heuristic_score(text)
    combined = 0.7 * model_prob + 0.3 * heuristic_prob

    signals = []
    if heuristic_prob > 0.4:
        signals.append("linguistic-patterns")

    return {
        "is_fake": combined > 0.6,
        "confidence": float(combined),
        "model_confidence": model_prob,
        "heuristic_confidence": heuristic_prob,
        "signals": signals,
    }
