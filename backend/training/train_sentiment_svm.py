"""
Train SVM model for sentiment analysis.

Loads training data from CSV file.

Usage:
    python training/train_sentiment_svm.py --csv training/data/sentiment_reviews.csv

CSV format: text,label (1=positive, 0=negative)
"""
import argparse
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score

from data_loader import load_training_data

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
DEFAULT_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "sentiment_reviews.csv")
os.makedirs(MODEL_DIR, exist_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Train SVM sentiment analysis model")
    parser.add_argument("--csv", type=str, default=DEFAULT_CSV, help="Path to CSV file (columns: text, label)")
    args = parser.parse_args()

    texts, labels = load_training_data(args.csv)

    print(f"Total samples: {len(texts)}")
    print(f"Positive reviews: {sum(labels)}")
    print(f"Negative reviews: {len(labels) - sum(labels)}")

    # Split
    X_train, X_temp, y_train, y_temp = train_test_split(
        texts, labels, test_size=0.3, random_state=42, stratify=labels
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp
    )

    print(f"\nTraining set: {len(X_train)} samples")
    print(f"Validation set: {len(X_val)} samples")
    print(f"Test set: {len(X_test)} samples")

    # Vectorize
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=5000, min_df=2)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_val_vec = vectorizer.transform(X_val)
    X_test_vec = vectorizer.transform(X_test)

    # Train SVM with calibration
    base_model = LinearSVC(random_state=42, max_iter=10000, C=1.0)
    model = CalibratedClassifierCV(base_model, cv=5)
    model.fit(X_train_vec, y_train)

    # Evaluate
    y_val_pred = model.predict(X_val_vec)
    val_f1 = f1_score(y_val, y_val_pred)
    print(f"\nValidation F1 Score: {val_f1:.4f}")

    y_test_pred = model.predict(X_test_vec)
    test_f1 = f1_score(y_test, y_test_pred)
    print(f"Test F1 Score: {test_f1:.4f}")
    print("\nTest Classification Report:")
    print(classification_report(y_test, y_test_pred, target_names=["Negative", "Positive"]))

    # Save
    joblib.dump(model, os.path.join(MODEL_DIR, "sentiment_svm.pkl"))
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "sentiment_svm_vectorizer.pkl"))
    print(f"\nModel saved to {MODEL_DIR}")


if __name__ == "__main__":
    main()
