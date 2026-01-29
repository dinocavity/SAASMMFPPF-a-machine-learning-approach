import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Placeholder training data — replace with real dataset on Google Colab
texts = [
    "Very good product",
    "Excellent quality",
    "I love this item",
    "Great purchase, highly satisfied",
    "Amazing experience would buy again",
    "Terrible experience",
    "Very bad product",
    "Not worth the money",
    "Awful quality, completely disappointed",
    "Horrible product do not buy",
]

labels = [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]  # 1 = positive, 0 = negative

vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
X = vectorizer.fit_transform(texts)

base_model = LinearSVC(random_state=42, max_iter=10000)
model = CalibratedClassifierCV(base_model, cv=2)
model.fit(X, labels)

joblib.dump(model, os.path.join(MODEL_DIR, "custom_sentiment_2.pkl"))
joblib.dump(vectorizer, os.path.join(MODEL_DIR, "vectorizer_2.pkl"))

print("SVM sentiment model trained and saved.")
