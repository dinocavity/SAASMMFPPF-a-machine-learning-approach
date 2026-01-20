import joblib

model = joblib.load("models/custom_sentiment.pkl")
vectorizer = joblib.load("models/vectorizer.pkl")

def analyze_sentiment_custom(text):
    X = vectorizer.transform([text])
    pred = model.predict(X)[0]
    prob = model.predict_proba(X)[0].max()

    return {
        "sentiment": "positive" if pred == 1 else "negative",
        "confidence": float(prob),
    }
