from fastapi import FastAPI
from pydantic import BaseModel
from sentiment_api import analyze_sentiment_api
from sentiment_custom import analyze_sentiment_custom
from fraud_custom import analyze_fraud

app = FastAPI(title="Shopee Review Analyzer API")

class Review(BaseModel):
    text: str

@app.post("/analyze")
def analyze(review: Review):
    return {
        "sentiment_api": analyze_sentiment_api(review.text),
        "sentiment_custom": analyze_sentiment_custom(review.text),
        "authenticity": analyze_fraud(review.text)
    }
