import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Placeholder training data — replace with real dataset on Google Colab
texts = [
    "Excellent product!!! Best ever!!!",
    "Highly recommended!!!",
    "Amazing quality must buy now!!!!",
    "Five stars perfect product love it",
    "Best purchase I ever made highly recommended to everyone",
    "Okay quality but delivery was late",
    "Product broke after a week",
    "Average product nothing special about it",
    "Decent quality for the price but could be better",
    "Not great, returned it after two days",
]

labels = [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]  # 1 = suspicious/fake

vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000)
X = vectorizer.fit_transform(texts)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, labels)

joblib.dump(model, os.path.join(MODEL_DIR, "fraud_model_2.pkl"))
joblib.dump(vectorizer, os.path.join(MODEL_DIR, "fraud_vectorizer_2.pkl"))

print("Random Forest fraud model trained and saved.")
