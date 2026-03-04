import logging
import os
import re
import time
from collections import Counter
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import MAX_TEXT_LENGTH, MIN_TEXT_LENGTH, LOG_LEVEL, RATE_LIMIT_RPM

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from evaluation import compute_binary_metrics, normalize_authenticity_label, normalize_sentiment_label

# Model imports
from fraud_hf_roberta import analyze_fraud_api as run_fraud_hf_roberta
from fraud_local_roberta import analyze_fraud as run_fraud_local_roberta
from fraud_random_forest import analyze_fraud_2 as run_fraud_random_forest
from sentiment_hf_distilbert import analyze_sentiment_api as run_sentiment_hf_distilbert
from sentiment_local_roberta import analyze_sentiment_custom as run_sentiment_local_roberta
from sentiment_svm import analyze_sentiment_2 as run_sentiment_svm

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="SAASMMFPPF API", version="1.0.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 1)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)")
    return response


origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ── Model registry ──────────────────────────────────────────────────
# Maps toggle IDs to runner functions and display names.

FRAUD_MODELS = {
    "fraud_api":     {"fn": run_fraud_hf_roberta,     "name": "HuggingFace API (RoBERTa SST-2)", "source": "api"},
    "fraud_local_1": {"fn": run_fraud_local_roberta,  "name": "RoBERTa Transformer",             "source": "local"},
    "fraud_local_2": {"fn": run_fraud_random_forest,  "name": "Random Forest (TF-IDF)",           "source": "local"},
}

SENTIMENT_MODELS = {
    "sentiment_api":     {"fn": run_sentiment_hf_distilbert, "name": "HuggingFace API (DistilBERT)", "source": "api"},
    "sentiment_local_1": {"fn": run_sentiment_local_roberta, "name": "RoBERTa (Twitter)",            "source": "local"},
    "sentiment_local_2": {"fn": run_sentiment_svm,           "name": "SVM (TF-IDF)",                 "source": "local"},
}

VALID_MODEL_IDS = set(FRAUD_MODELS) | set(SENTIMENT_MODELS)
FRAUD_MODEL_IDS = set(FRAUD_MODELS)
SENTIMENT_MODEL_IDS = set(SENTIMENT_MODELS)

# Flat list for the GET /models endpoint
MODEL_REGISTRY = [
    {"id": mid, "name": m["name"], "type": "fraud", "source": m["source"]}
    for mid, m in FRAUD_MODELS.items()
] + [
    {"id": mid, "name": m["name"], "type": "sentiment", "source": m["source"]}
    for mid, m in SENTIMENT_MODELS.items()
]


# ── Pydantic models ────────────────────────────────────────────────

class Review(BaseModel):
    text: str
    disabled_models: Optional[list[str]] = None

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Text cannot be empty")
        if len(v) < MIN_TEXT_LENGTH:
            raise ValueError(f"Text must be at least {MIN_TEXT_LENGTH} characters")
        if len(v) > MAX_TEXT_LENGTH:
            raise ValueError(f"Text exceeds maximum length of {MAX_TEXT_LENGTH} characters")
        return v.strip()

    @field_validator("disabled_models")
    @classmethod
    def validate_disabled_models(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        for model_id in v:
            if model_id not in VALID_MODEL_IDS:
                raise ValueError(f"Invalid model ID: {model_id}. Valid IDs: {sorted(VALID_MODEL_IDS)}")
        enabled_fraud = FRAUD_MODEL_IDS - set(v)
        enabled_sentiment = SENTIMENT_MODEL_IDS - set(v)
        if not enabled_fraud:
            raise ValueError("At least 1 fraud detection model must remain enabled")
        if not enabled_sentiment:
            raise ValueError("At least 1 sentiment analysis model must remain enabled")
        return v


class LabeledReview(BaseModel):
    text: str
    sentiment_label: str
    authenticity_label: str


class EvaluationRequest(BaseModel):
    samples: list[LabeledReview]


# ── Helpers ─────────────────────────────────────────────────────────

def _run_model(fn, text: str, display_name: str) -> dict:
    """Run a model function safely, returning an error result on failure."""
    try:
        result = fn(text)
        result["status"] = "ok"
        return result
    except Exception as e:
        logger.error(f"Model {display_name} failed: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "model_name": display_name,
        }


def _disabled_result(display_name: str) -> dict:
    """Return a placeholder result for disabled models."""
    return {
        "status": "disabled",
        "model_name": display_name,
    }


def _run_model_group(models: dict, text: str, disabled: set) -> dict[str, dict]:
    """Run a group of models, skipping any that are disabled.

    Returns a dict keyed by the response key (api / local_1 / local_2).
    """
    results = {}
    for model_id, meta in models.items():
        # Derive the response key from the model ID  (e.g. "fraud_api" → "api")
        key = model_id.split("_", 1)[1]
        if model_id in disabled:
            results[key] = _disabled_result(meta["name"])
        else:
            results[key] = _run_model(meta["fn"], text, meta["name"])
    return results


def _heuristic_fraud_fallback(text: str) -> dict:
    """Simple heuristic-based fraud detection when all models fail."""
    lowered = text.lower()

    fake_hints = {"best ever", "highly recommended", "must buy", "life changing", "five stars", "perfect product"}
    genuine_hints = {"okay", "average", "not bad", "decent", "broke", "poor", "returned"}

    fake_hits = sum(1 for phrase in fake_hints if phrase in lowered)
    genuine_hits = sum(1 for phrase in genuine_hints if phrase in lowered)
    exclamations = text.count("!")

    score = 0.5
    score += fake_hits * 0.1
    score -= genuine_hits * 0.1
    score += min(exclamations / 10.0, 0.15)
    if len(text) < 30:
        score += 0.1

    score = max(0.0, min(score, 1.0))

    return {
        "is_fake": score > 0.6,
        "confidence": score,
        "model_name": "Heuristic Fallback",
        "status": "fallback",
        "is_fallback": True,
    }


def _heuristic_sentiment_fallback(text: str) -> dict:
    """Simple heuristic-based sentiment analysis when all models fail."""
    lowered = text.lower()

    positive_words = {"great", "amazing", "excellent", "love", "perfect", "recommend", "good", "awesome", "fantastic"}
    negative_words = {"bad", "terrible", "awful", "hate", "broken", "worst", "poor", "horrible", "disappointing"}

    pos_count = sum(1 for word in positive_words if word in lowered)
    neg_count = sum(1 for word in negative_words if word in lowered)

    if pos_count > neg_count:
        sentiment = "positive"
        confidence = min(0.5 + (pos_count - neg_count) * 0.1, 0.9)
    elif neg_count > pos_count:
        sentiment = "negative"
        confidence = min(0.5 + (neg_count - pos_count) * 0.1, 0.9)
    else:
        sentiment = "neutral"
        confidence = 0.5

    return {
        "sentiment": sentiment,
        "confidence": confidence,
        "model_name": "Heuristic Fallback",
        "status": "fallback",
        "is_fallback": True,
    }


def _compute_text_metadata(text: str) -> dict:
    words = text.split()
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    word_count = len(words)
    sentence_count = max(len(sentences), 1)
    avg_word_length = round(sum(len(w) for w in words) / max(word_count, 1), 2)
    avg_sentence_length = round(word_count / sentence_count, 2)
    return {
        "char_count": len(text),
        "word_count": word_count,
        "sentence_count": len(sentences),
        "avg_word_length": avg_word_length,
        "avg_sentence_length": avg_sentence_length,
    }


# ── Endpoints ───────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and container orchestration."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "SAASMMFPPF API",
    }


@app.get("/models")
def list_models():
    """Return available models with IDs, names, and types."""
    return {"models": MODEL_REGISTRY}


@app.post("/analyze")
@limiter.limit(f"{RATE_LIMIT_RPM}/minute")
def analyze(review: Review, request: Request):
    disabled = set(review.disabled_models or [])

    # Run all models (disabled ones get a placeholder)
    fraud_results = _run_model_group(FRAUD_MODELS, review.text, disabled)
    sentiment_results = _run_model_group(SENTIMENT_MODELS, review.text, disabled)

    # ── Fraud consensus (only enabled + ok models) ──
    fraud_ok = [m for m in fraud_results.values() if m["status"] == "ok"]
    fraud_enabled = [m for m in fraud_results.values() if m["status"] != "disabled"]

    if fraud_ok:
        fraud_avg = sum(m["confidence"] for m in fraud_ok) / len(fraud_ok)
        fraud_votes = [m["is_fake"] for m in fraud_ok]
        consensus_is_fake = sum(fraud_votes) > len(fraud_votes) / 2
    else:
        logger.warning("All fraud models failed, using heuristic fallback")
        fallback = _heuristic_fraud_fallback(review.text)
        fraud_avg = fallback["confidence"]
        consensus_is_fake = fallback["is_fake"]
        # Replace the first result with the fallback so the client sees it
        first_key = next(iter(fraud_results))
        fraud_results[first_key] = fallback

    # ── Sentiment consensus (only enabled + ok models) ──
    sentiment_ok = [m for m in sentiment_results.values() if m["status"] == "ok"]
    sentiment_enabled = [m for m in sentiment_results.values() if m["status"] != "disabled"]

    if sentiment_ok:
        sentiment_avg = sum(m["confidence"] for m in sentiment_ok) / len(sentiment_ok)
        sentiment_votes = [m["sentiment"] for m in sentiment_ok]
        vote_counts = Counter(sentiment_votes)
        consensus_sentiment = vote_counts.most_common(1)[0][0]
    else:
        logger.warning("All sentiment models failed, using heuristic fallback")
        fallback = _heuristic_sentiment_fallback(review.text)
        sentiment_avg = fallback["confidence"]
        consensus_sentiment = fallback["sentiment"]
        first_key = next(iter(sentiment_results))
        sentiment_results[first_key] = fallback

    return {
        "fraud": {
            "models": fraud_results,
            "average_confidence": round(fraud_avg, 4) if fraud_avg is not None else None,
            "consensus_is_fake": consensus_is_fake,
            "models_ok": len(fraud_ok),
            "models_total": len(fraud_enabled),
        },
        "sentiment": {
            "models": sentiment_results,
            "average_confidence": round(sentiment_avg, 4) if sentiment_avg is not None else None,
            "consensus_sentiment": consensus_sentiment,
            "models_ok": len(sentiment_ok),
            "models_total": len(sentiment_enabled),
        },
        "text_metadata": _compute_text_metadata(review.text),
    }


@app.post("/evaluate")
@limiter.limit(f"{RATE_LIMIT_RPM}/minute")
def evaluate(payload: EvaluationRequest, request: Request):
    if not payload.samples:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No samples provided")

    # Accumulators — named by actual model type
    sentiment_true = []
    sent_distilbert_pred, sent_distilbert_score = [], []   # HuggingFace API (DistilBERT)
    sent_roberta_pred,    sent_roberta_score    = [], []   # Local RoBERTa (Twitter)
    sent_svm_pred,        sent_svm_score        = [], []   # SVM (TF-IDF)

    authenticity_true = []
    fraud_hf_roberta_pred,  fraud_hf_roberta_score  = [], []   # HuggingFace API (RoBERTa SST-2)
    fraud_roberta_pred,     fraud_roberta_score      = [], []   # Local RoBERTa
    fraud_rf_pred,          fraud_rf_score           = [], []   # Random Forest (TF-IDF)

    for sample in payload.samples:
        sentiment_true.append(normalize_sentiment_label(sample.sentiment_label))
        authenticity_true.append(normalize_authenticity_label(sample.authenticity_label))

        # Sentiment models
        distilbert_result = run_sentiment_hf_distilbert(sample.text)
        roberta_sent_result = run_sentiment_local_roberta(sample.text)
        svm_result = run_sentiment_svm(sample.text)

        sent_distilbert_pred.append(1 if distilbert_result.get("sentiment") == "positive" else 0)
        sent_distilbert_score.append(float(distilbert_result.get("confidence", 0.0)))

        sent_roberta_pred.append(1 if roberta_sent_result.get("sentiment") == "positive" else 0)
        sent_roberta_score.append(float(roberta_sent_result.get("confidence", 0.0)))

        sent_svm_pred.append(1 if svm_result.get("sentiment") == "positive" else 0)
        sent_svm_score.append(float(svm_result.get("confidence", 0.0)))

        # Fraud models
        hf_roberta_result = run_fraud_hf_roberta(sample.text)
        roberta_fraud_result = run_fraud_local_roberta(sample.text)
        rf_result = run_fraud_random_forest(sample.text)

        fraud_hf_roberta_pred.append(1 if hf_roberta_result.get("is_fake") else 0)
        fraud_hf_roberta_score.append(float(hf_roberta_result.get("confidence", 0.0)))

        fraud_roberta_pred.append(1 if roberta_fraud_result.get("is_fake") else 0)
        fraud_roberta_score.append(float(roberta_fraud_result.get("confidence", 0.0)))

        fraud_rf_pred.append(1 if rf_result.get("is_fake") else 0)
        fraud_rf_score.append(float(rf_result.get("confidence", 0.0)))

    return {
        "sentiment_distilbert_api": compute_binary_metrics(
            sentiment_true, sent_distilbert_pred, sent_distilbert_score,
        ),
        "sentiment_roberta_local": compute_binary_metrics(
            sentiment_true, sent_roberta_pred, sent_roberta_score,
        ),
        "sentiment_svm": compute_binary_metrics(
            sentiment_true, sent_svm_pred, sent_svm_score,
        ),
        "fraud_roberta_api": compute_binary_metrics(
            authenticity_true, fraud_hf_roberta_pred, fraud_hf_roberta_score,
        ),
        "fraud_roberta_local": compute_binary_metrics(
            authenticity_true, fraud_roberta_pred, fraud_roberta_score,
        ),
        "fraud_random_forest": compute_binary_metrics(
            authenticity_true, fraud_rf_pred, fraud_rf_score,
        ),
        "sample_count": len(payload.samples),
    }
