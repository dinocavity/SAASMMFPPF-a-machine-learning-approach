"""
Train Random Forest model for fraud detection.

Loads training data from CSV file.

Usage:
    python training/train_fraud_random_forest.py --csv training/data/fraud_reviews.csv

CSV format: text,label (1=fake, 0=genuine)
"""
import argparse
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score

from data_loader import load_training_data

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
DEFAULT_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "fraud_reviews.csv")
os.makedirs(MODEL_DIR, exist_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Train Random Forest fraud detection model")
    parser.add_argument("--csv", type=str, default=DEFAULT_CSV, help="Path to CSV file (columns: text, label)")
    args = parser.parse_args()

    texts, labels = load_training_data(args.csv)

    print(f"Total samples: {len(texts)}")
    print(f"Fake reviews: {sum(labels)}")
    print(f"Genuine reviews: {len(labels) - sum(labels)}")

    # Split: 70% train, 15% val, 15% test
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
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000, min_df=2)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_val_vec = vectorizer.transform(X_val)
    X_test_vec = vectorizer.transform(X_test)

    # Train Random Forest
    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, max_depth=20)
    model.fit(X_train_vec, y_train)

    # Evaluate
    y_val_pred = model.predict(X_val_vec)
    val_f1 = f1_score(y_val, y_val_pred)
    print(f"\nValidation F1 Score: {val_f1:.4f}")

    y_test_pred = model.predict(X_test_vec)
    test_f1 = f1_score(y_test, y_test_pred)
    print(f"Test F1 Score: {test_f1:.4f}")
    print("\nTest Classification Report:")
    print(classification_report(y_test, y_test_pred, target_names=["Genuine", "Fake"]))

    # Save
    joblib.dump(model, os.path.join(MODEL_DIR, "fraud_random_forest.pkl"))
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "fraud_random_forest_vectorizer.pkl"))
    print(f"\nModel saved to {MODEL_DIR}")


if __name__ == "__main__":
    main()
