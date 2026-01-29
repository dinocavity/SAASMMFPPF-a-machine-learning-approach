import joblib

model = joblib.load("models/fraud_model_2.pkl")
vectorizer = joblib.load("models/fraud_vectorizer_2.pkl")


def analyze_fraud_2(text):
    X = vectorizer.transform([text])
    pred = model.predict(X)[0]
    prob = float(model.predict_proba(X)[0][1])

    return {
        "is_fake": prob > 0.6,
        "confidence": prob,
        "model_name": "Random Forest",
    }
