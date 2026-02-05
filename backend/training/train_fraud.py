"""
Train Logistic Regression model for fraud detection.

This module trains a text classifier to distinguish fake/suspicious reviews
from genuine ones using TF-IDF features and Logistic Regression.

Note: For production, replace this training data with a real labeled dataset
of at least 1000+ genuine and 1000+ fake reviews.
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

# Extended training data - 50 examples (25 fake, 25 genuine)
# In production, replace with a real dataset of 1000+ samples per class
# Sources for real data: Amazon Review Dataset, Yelp Fake Review Dataset
fake_reviews = [
    "Excellent product!!! Best ever!!!",
    "Highly recommended!!! Amazing quality!!!",
    "Five stars! Perfect product! Must buy!",
    "Life changing product! Best purchase ever!",
    "Amazing!!! Love it so much!!! Perfect!!!",
    "Best product I have ever purchased! Highly recommend to everyone!",
    "Perfect! Exactly what I needed! Five stars!!!",
    "Outstanding quality! Will buy again! Recommended!",
    "This is the best thing I ever bought! Amazing!!!",
    "Incredible product! Changed my life! Must have!!!",
    "WOW!!! So good!!! Best ever!!! Buy now!!!",
    "Perfect perfect perfect! Love love love!",
    "Absolutely amazing! Best purchase! Recommended!",
    "This product is literally perfect in every way!",
    "Cannot say enough good things about this! Perfect!",
    "5 stars! Best quality! Highly recommended! Buy now!",
    "Amazing amazing amazing! So perfect!",
    "Best ever! Perfect quality! Must buy!!! Wow!!!",
    "Incredible! Fantastic! Perfect! Love it!",
    "This is hands down the best product ever made!",
    "Perfect product! Perfect quality! Perfect price! 5 stars!",
    "Amazing purchase! So happy! Best decision ever!",
    "Absolutely perfect! No complaints! Highly recommend!",
    "Best product on the market! Everyone should buy!",
    "Perfect in every single way! Amazing quality!",
]

genuine_reviews = [
    "Okay quality but delivery was late",
    "Product broke after a week, disappointing",
    "Average product, nothing special about it",
    "Decent quality for the price but could be better",
    "Not great, returned it after two days",
    "Works as expected, nothing fancy",
    "Good value for money, satisfied with purchase",
    "The product is fine but shipping took forever",
    "Quality is acceptable for the price point",
    "Had some issues initially but works now",
    "Decent product, met my basic expectations",
    "Nothing spectacular but gets the job done",
    "Arrived with minor damage but usable",
    "Average quality, would not buy again",
    "Product works but instructions were confusing",
    "Okay product, expected better based on reviews",
    "Fair quality for what I paid",
    "Some features work well, others not so much",
    "Took a while to arrive but product is decent",
    "Not bad but not great either, just average",
    "Product does what it says, nothing more",
    "Had to contact support for setup help",
    "Decent build quality but feels cheap",
    "Works fine for basic use cases",
    "Met expectations, nothing extraordinary",
]

texts = fake_reviews + genuine_reviews
labels = [1] * len(fake_reviews) + [0] * len(genuine_reviews)  # 1 = fake/suspicious

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

vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000)
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
print(classification_report(y_test, y_test_pred, target_names=["Genuine", "Fake"]))

# Save model and vectorizer
joblib.dump(model, os.path.join(MODEL_DIR, "fraud_model.pkl"))
joblib.dump(vectorizer, os.path.join(MODEL_DIR, "fraud_vectorizer.pkl"))

print("\nLogistic Regression fraud model trained and saved.")
print(f"Note: For production, use a larger dataset (1000+ samples per class).")
