import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

texts = [
    "Very good product",
    "Excellent quality",
    "I love this item",
    "Terrible experience",
    "Very bad product",
    "Not worth the money"
]

labels = [1,1,1,0,0,0]

vectorizer = TfidfVectorizer(stop_words="english")
X = vectorizer.fit_transform(texts)

model = LogisticRegression()
model.fit(X, labels)

joblib.dump(model, os.path.join(MODEL_DIR, "custom_sentiment.pkl"))
joblib.dump(vectorizer, os.path.join(MODEL_DIR, "vectorizer.pkl"))
