import joblib

model = joblib.load("models/custom_sentiment_2.pkl")
vectorizer = joblib.load("models/vectorizer_2.pkl")


def analyze_sentiment_2(text):
    X = vectorizer.transform([text])
    pred = model.predict(X)[0]
    prob = float(model.predict_proba(X)[0].max())

    return {
        "sentiment": "positive" if pred == 1 else "negative",
        "confidence": prob,
        "model_name": "SVM",
    }
