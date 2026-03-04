import threading

from transformers import pipeline

# Lazy-loaded classifier to avoid blocking server startup
_classifier = None
_classifier_lock = threading.Lock()


def _get_classifier():
    """Lazy-load the classifier on first use."""
    global _classifier
    if _classifier is None:
        with _classifier_lock:
            if _classifier is None:
                _classifier = pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                    top_k=None,
                )
    return _classifier

# Map model labels to normalized names
_LABEL_MAP = {
    "positive": "positive",
    "negative": "negative",
    "neutral": "neutral",
}


def analyze_sentiment_custom(text):
    classifier = _get_classifier()
    raw_scores = classifier(text[:512])[0]

    class_probabilities = {}
    for item in raw_scores:
        label = _LABEL_MAP.get(item["label"], item["label"])
        class_probabilities[label] = round(item["score"], 4)

    # Pick the highest-scoring label
    best = max(raw_scores, key=lambda x: x["score"])
    sentiment = _LABEL_MAP.get(best["label"], best["label"])
    confidence = float(best["score"])

    return {
        "sentiment": sentiment,
        "confidence": confidence,
        "model_name": "RoBERTa",
        "class_probabilities": class_probabilities,
    }
