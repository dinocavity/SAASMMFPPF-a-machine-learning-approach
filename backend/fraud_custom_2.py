import joblib
import numpy as np

model = joblib.load("models/fraud_model_2.pkl")
vectorizer = joblib.load("models/fraud_vectorizer_2.pkl")

DECISION_THRESHOLD = 0.6


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
