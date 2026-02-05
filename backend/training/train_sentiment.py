"""
Train Logistic Regression model for sentiment analysis.

This module trains a text classifier to distinguish positive from negative
sentiment using TF-IDF features and Logistic Regression.

Note: For production, replace this training data with a real labeled dataset
of at least 1000+ positive and 1000+ negative samples.
"""
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Extended training data - 50 examples (25 positive, 25 negative)
# In production, replace with a real dataset of 1000+ samples per class
# Sources for real data: Stanford Sentiment Treebank, IMDB Reviews
positive_reviews = [
    "Very good product, highly satisfied",
    "Excellent quality, worth every penny",
    "I love this item, exactly what I needed",
    "Great purchase, highly satisfied with it",
    "Amazing experience, would buy again",
    "Perfect for my needs, really happy",
    "Wonderful product, exceeded expectations",
    "Really impressed with the quality",
    "Fantastic item, works perfectly",
    "Best purchase I have made recently",
    "Super happy with this product",
    "Great value for money",
    "Absolutely love it, highly recommend",
    "Very pleased with my purchase",
    "Excellent product, fast shipping too",
    "Works great, very satisfied",
    "High quality, exactly as described",
    "Love the design and functionality",
    "Impressed with the build quality",
    "Perfect condition, fast delivery",
    "Exactly what I was looking for",
    "Great product, will order again",
    "Very happy with this purchase",
    "Exceeded my expectations",
    "Highly recommend this product",
]

negative_reviews = [
    "Terrible experience, very disappointed",
    "Very bad product, waste of money",
    "Not worth the money at all",
    "Awful quality, completely disappointed",
    "Horrible product, do not buy",
    "Worst purchase I have ever made",
    "Product broke after one day",
    "Very poor quality, not as described",
    "Terrible, returning immediately",
    "Completely useless product",
    "Waste of money, very upset",
    "Disappointed with the quality",
    "Does not work as advertised",
    "Very low quality materials",
    "Broken on arrival, very frustrated",
    "Not what I expected at all",
    "Poor construction, fell apart quickly",
    "Would not recommend to anyone",
    "Regret buying this product",
    "Cheaply made, not durable",
    "Defective product received",
    "Very unhappy with purchase",
    "Quality is much worse than shown",
    "Total waste of money",
    "Never buying from here again",
]

texts = positive_reviews + negative_reviews
labels = [1] * len(positive_reviews) + [0] * len(negative_reviews)  # 1 = positive

# Split data: 70% train, 15% validation, 15% test
X_train, X_temp, y_train, y_temp = train_test_split(
    texts, labels, test_size=0.3, random_state=42, stratify=labels
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp
)

print(f"Training set: {len(X_train)} samples")
print(f"Validation set: {len(X_val)} samples")
print(f"Test set: {len(X_test)} samples")

vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=5000)
X_train_vec = vectorizer.fit_transform(X_train)
X_val_vec = vectorizer.transform(X_val)
X_test_vec = vectorizer.transform(X_test)

model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_train_vec, y_train)

# Evaluate on validation set
y_val_pred = model.predict(X_val_vec)
val_f1 = f1_score(y_val, y_val_pred)
print(f"\nValidation F1 Score: {val_f1:.4f}")

# Evaluate on test set
y_test_pred = model.predict(X_test_vec)
test_f1 = f1_score(y_test, y_test_pred)
print(f"Test F1 Score: {test_f1:.4f}")
print("\nTest Set Classification Report:")
print(classification_report(y_test, y_test_pred, target_names=["Negative", "Positive"]))

# Save model and vectorizer
joblib.dump(model, os.path.join(MODEL_DIR, "custom_sentiment.pkl"))
joblib.dump(vectorizer, os.path.join(MODEL_DIR, "vectorizer.pkl"))

print("\nLogistic Regression sentiment model trained and saved.")
print(f"Note: For production, use a larger dataset (1000+ samples per class).")
