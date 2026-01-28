import os

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
from fraud_custom import analyze_fraud

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

@app.post("/analyze")
def analyze(review: Review, current_user: User = Depends(get_optional_user)):
    return {
        "sentiment_api": analyze_sentiment_api(review.text),
        "sentiment_custom": analyze_sentiment_custom(review.text),
        "authenticity": analyze_fraud(review.text)
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
    authenticity_true = []
    authenticity_pred = []
    authenticity_score = []

    for sample in payload.samples:
        sentiment_true.append(normalize_sentiment_label(sample.sentiment_label))
        authenticity_true.append(normalize_authenticity_label(sample.authenticity_label))

        api_result = analyze_sentiment_api(sample.text)
        custom_result = analyze_sentiment_custom(sample.text)
        fraud_result = analyze_fraud(sample.text)

        sentiment_api_pred.append(1 if api_result.get("sentiment") == "positive" else 0)
        sentiment_api_score.append(float(api_result.get("confidence", 0.0)))

        sentiment_custom_pred.append(1 if custom_result.get("sentiment") == "positive" else 0)
        sentiment_custom_score.append(float(custom_result.get("confidence", 0.0)))

        authenticity_pred.append(1 if fraud_result.get("is_fake") else 0)
        authenticity_score.append(float(fraud_result.get("confidence", 0.0)))

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
        "authenticity": compute_binary_metrics(
            authenticity_true,
            authenticity_pred,
            authenticity_score,
        ),
        "sample_count": len(payload.samples),
    }
