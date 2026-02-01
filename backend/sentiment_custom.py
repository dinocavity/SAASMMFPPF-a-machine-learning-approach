from transformers import pipeline

_classifier = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    top_k=None,
)

# Map model labels to normalized names
_LABEL_MAP = {
    "positive": "positive",
    "negative": "negative",
    "neutral": "neutral",
}


def analyze_sentiment_custom(text):
    raw_scores = _classifier(text[:512])[0]

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
