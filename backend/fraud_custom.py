import joblib

model = joblib.load("models/fraud_model.pkl")
vectorizer = joblib.load("models/fraud_vectorizer.pkl")

def analyze_fraud(text):
    X = vectorizer.transform([text])
    prob = model.predict_proba(X)[0][1]

    return {
        "is_fake": prob > 0.6,
        "confidence": float(prob),
    }
