import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import authenticate_user, create_access_token, ensure_superadmin, get_current_user
from db import Base, SessionLocal, engine, get_db
from models import User
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
def analyze(review: Review, current_user: User = Depends(get_current_user)):
    return {
        "sentiment_api": analyze_sentiment_api(review.text),
        "sentiment_custom": analyze_sentiment_custom(review.text),
        "authenticity": analyze_fraud(review.text)
    }
