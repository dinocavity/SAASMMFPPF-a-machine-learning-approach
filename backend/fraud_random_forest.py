import os
import joblib
import numpy as np

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_BASE_DIR, "models", "fraud_random_forest.pkl")
_VECTORIZER_PATH = os.path.join(_BASE_DIR, "models", "fraud_random_forest_vectorizer.pkl")

model = joblib.load(_MODEL_PATH)
vectorizer = joblib.load(_VECTORIZER_PATH)

from config import FRAUD_DECISION_THRESHOLD

DECISION_THRESHOLD = FRAUD_DECISION_THRESHOLD


def analyze_fraud_2(text):
    X = vectorizer.transform([text])
    pred = model.predict(X)[0]
    prob = float(model.predict_proba(X)[0][1])

    # Extract top contributing features
    top_features = []
    if hasattr(model, "feature_importances_"):
        feature_names = vectorizer.get_feature_names_out()
        importances = model.feature_importances_
        # Get the active (non-zero) features for this input
        active_indices = X.nonzero()[1]
        tfidf_values = X.toarray()[0]

        contributions = []
        for idx in active_indices:
            contributions.append({
                "word": feature_names[idx],
                "tfidf_score": round(float(tfidf_values[idx]), 4),
                "importance": round(float(importances[idx]), 4),
                "contribution": round(float(tfidf_values[idx] * importances[idx]), 6),
            })

        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        top_features = contributions[:10]

    return {
        "is_fake": prob > DECISION_THRESHOLD,
        "confidence": prob,
        "model_name": "Random Forest",
        "top_features": top_features,
        "decision_threshold": DECISION_THRESHOLD,
    }
