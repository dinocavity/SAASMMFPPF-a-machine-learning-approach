import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

texts = [
    "Excellent product!!! Best ever!!!",
    "Highly recommended!!!",
    "Okay quality but delivery was late",
    "Product broke after a week"
]

labels = [1,1,0,0]  # 1 = suspicious

vectorizer = TfidfVectorizer(ngram_range=(1,2))
X = vectorizer.fit_transform(texts)

model = LogisticRegression()
model.fit(X, labels)

joblib.dump(model, os.path.join (MODEL_DIR,"fraud_model.pkl"))
joblib.dump(vectorizer, os.path.join (MODEL_DIR, "fraud_vectorizer.pkl"))
