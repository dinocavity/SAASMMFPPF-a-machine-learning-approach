import os
from collections import Counter

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import authenticate_user, create_access_token, ensure_superadmin, get_current_user, get_optional_user
from db import Base, SessionLocal, engine, get_db
from models import User
from evaluation import compute_binary_metrics, normalize_authenticity_label, normalize_sentiment_label
from sentiment_api import analyze_sentiment_api
from sentiment_custom import analyze_sentiment_custom
from sentiment_custom_2 import analyze_sentiment_2
from fraud_custom import analyze_fraud
from fraud_custom_2 import analyze_fraud_2
from fraud_api import analyze_fraud_api

app = FastAPI(title="SAASMMFPPF API")

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Review(BaseModel):
    text: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    username: str
    is_superadmin: bool


class LabeledReview(BaseModel):
    text: str
    sentiment_label: str
    authenticity_label: str


class EvaluationRequest(BaseModel):
    samples: list[LabeledReview]


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_superadmin(db)
    finally:
        db.close()


@app.post("/auth/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token)


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(username=current_user.username, is_superadmin=current_user.is_superadmin)

def _run_model(fn, text, model_name):
    """Run a model function safely, returning an error result on failure."""
    try:
        result = fn(text)
        result["status"] = "ok"
        return result
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "model_name": model_name,
        }


@app.post("/analyze")
def analyze(review: Review, current_user: User = Depends(get_optional_user)):
    # Run all 6 models with error isolation
    fraud_api = _run_model(analyze_fraud_api, review.text, "HuggingFace API")
    fraud_local_1 = _run_model(analyze_fraud, review.text, "Logistic Regression")
    fraud_local_2 = _run_model(analyze_fraud_2, review.text, "Random Forest")

    sentiment_api = _run_model(analyze_sentiment_api, review.text, "HuggingFace API")
    sentiment_local_1 = _run_model(analyze_sentiment_custom, review.text, "Logistic Regression")
    sentiment_local_2 = _run_model(analyze_sentiment_2, review.text, "SVM")

    # Fraud averages and consensus (only from successful models)
    fraud_ok = [m for m in [fraud_api, fraud_local_1, fraud_local_2] if m["status"] == "ok"]
    if fraud_ok:
        fraud_avg = sum(m["confidence"] for m in fraud_ok) / len(fraud_ok)
        fraud_votes = [m["is_fake"] for m in fraud_ok]
        consensus_is_fake = sum(fraud_votes) > len(fraud_votes) / 2
    else:
        fraud_avg = None
        consensus_is_fake = None

    # Sentiment averages and consensus (only from successful models)
    sentiment_ok = [m for m in [sentiment_api, sentiment_local_1, sentiment_local_2] if m["status"] == "ok"]
    if sentiment_ok:
        sentiment_avg = sum(m["confidence"] for m in sentiment_ok) / len(sentiment_ok)
        sentiment_votes = [m["sentiment"] for m in sentiment_ok]
        vote_counts = Counter(sentiment_votes)
        consensus_sentiment = vote_counts.most_common(1)[0][0]
    else:
        sentiment_avg = None
        consensus_sentiment = None

    return {
        "fraud": {
            "models": {
                "api": fraud_api,
                "local_1": fraud_local_1,
                "local_2": fraud_local_2,
            },
            "average_confidence": round(fraud_avg, 4) if fraud_avg is not None else None,
            "consensus_is_fake": consensus_is_fake,
            "models_ok": len(fraud_ok),
            "models_total": 3,
        },
        "sentiment": {
            "models": {
                "api": sentiment_api,
                "local_1": sentiment_local_1,
                "local_2": sentiment_local_2,
            },
            "average_confidence": round(sentiment_avg, 4) if sentiment_avg is not None else None,
            "consensus_sentiment": consensus_sentiment,
            "models_ok": len(sentiment_ok),
            "models_total": 3,
        },
    }


@app.post("/evaluate")
def evaluate(payload: EvaluationRequest, current_user: User = Depends(get_current_user)):
    if not payload.samples:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No samples provided")

    sentiment_true = []
    sentiment_api_pred = []
    sentiment_api_score = []
    sentiment_custom_pred = []
    sentiment_custom_score = []
    sentiment_svm_pred = []
    sentiment_svm_score = []
    authenticity_true = []
    authenticity_lr_pred = []
    authenticity_lr_score = []
    authenticity_rf_pred = []
    authenticity_rf_score = []
    authenticity_api_pred = []
    authenticity_api_score = []

    for sample in payload.samples:
        sentiment_true.append(normalize_sentiment_label(sample.sentiment_label))
        authenticity_true.append(normalize_authenticity_label(sample.authenticity_label))

        api_result = analyze_sentiment_api(sample.text)
        custom_result = analyze_sentiment_custom(sample.text)
        svm_result = analyze_sentiment_2(sample.text)
        fraud_lr_result = analyze_fraud(sample.text)
        fraud_rf_result = analyze_fraud_2(sample.text)
        fraud_api_result = analyze_fraud_api(sample.text)

        sentiment_api_pred.append(1 if api_result.get("sentiment") == "positive" else 0)
        sentiment_api_score.append(float(api_result.get("confidence", 0.0)))

        sentiment_custom_pred.append(1 if custom_result.get("sentiment") == "positive" else 0)
        sentiment_custom_score.append(float(custom_result.get("confidence", 0.0)))

        sentiment_svm_pred.append(1 if svm_result.get("sentiment") == "positive" else 0)
        sentiment_svm_score.append(float(svm_result.get("confidence", 0.0)))

        authenticity_lr_pred.append(1 if fraud_lr_result.get("is_fake") else 0)
        authenticity_lr_score.append(float(fraud_lr_result.get("confidence", 0.0)))

        authenticity_rf_pred.append(1 if fraud_rf_result.get("is_fake") else 0)
        authenticity_rf_score.append(float(fraud_rf_result.get("confidence", 0.0)))

        authenticity_api_pred.append(1 if fraud_api_result.get("is_fake") else 0)
        authenticity_api_score.append(float(fraud_api_result.get("confidence", 0.0)))

    return {
        "sentiment_api": compute_binary_metrics(
            sentiment_true,
            sentiment_api_pred,
            sentiment_api_score,
        ),
        "sentiment_custom": compute_binary_metrics(
            sentiment_true,
            sentiment_custom_pred,
            sentiment_custom_score,
        ),
        "sentiment_svm": compute_binary_metrics(
            sentiment_true,
            sentiment_svm_pred,
            sentiment_svm_score,
        ),
        "authenticity_lr": compute_binary_metrics(
            authenticity_true,
            authenticity_lr_pred,
            authenticity_lr_score,
        ),
        "authenticity_rf": compute_binary_metrics(
            authenticity_true,
            authenticity_rf_pred,
            authenticity_rf_score,
        ),
        "authenticity_api": compute_binary_metrics(
            authenticity_true,
            authenticity_api_pred,
            authenticity_api_score,
        ),
        "sample_count": len(payload.samples),
    }
