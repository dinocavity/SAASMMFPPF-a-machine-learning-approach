import os
import joblib
import numpy as np

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_BASE_DIR, "models", "custom_sentiment_2.pkl")
_VECTORIZER_PATH = os.path.join(_BASE_DIR, "models", "vectorizer_2.pkl")

model = joblib.load(_MODEL_PATH)
vectorizer = joblib.load(_VECTORIZER_PATH)


def analyze_sentiment_2(text):
    X = vectorizer.transform([text])
    pred = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    prob = float(proba.max())

    # Class probabilities
    classes = model.classes_ if hasattr(model, "classes_") else [0, 1]
    class_probabilities = {}
    for i, cls in enumerate(classes):
        label = "positive" if cls == 1 else "negative"
        class_probabilities[label] = round(float(proba[i]), 4)

    # Extract top features if model has coef_ (linear SVM)
    top_features = []
    if hasattr(model, "coef_"):
        feature_names = vectorizer.get_feature_names_out()
        coefs = model.coef_[0]
        active_indices = X.nonzero()[1]
        tfidf_values = X.toarray()[0]

        contributions = []
        for idx in active_indices:
            contributions.append({
                "word": feature_names[idx],
                "tfidf_score": round(float(tfidf_values[idx]), 4),
                "coefficient": round(float(coefs[idx]), 4),
                "contribution": round(float(tfidf_values[idx] * coefs[idx]), 6),
            })

        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        top_features = contributions[:10]

    return {
        "sentiment": "positive" if pred == 1 else "negative",
        "confidence": prob,
        "model_name": "SVM",
        "top_features": top_features,
        "class_probabilities": class_probabilities,
    }
