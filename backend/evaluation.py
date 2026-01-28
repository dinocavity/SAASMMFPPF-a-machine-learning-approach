from typing import Dict, List, Optional, Tuple

from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def _safe_roc_auc(y_true: List[int], y_score: List[float]) -> Optional[float]:
    if len(set(y_true)) < 2:
        return None
    try:
        return float(roc_auc_score(y_true, y_score))
    except ValueError:
        return None


def compute_binary_metrics(
    y_true: List[int],
    y_pred: List[int],
    y_score: Optional[List[float]] = None,
) -> Dict[str, object]:
    metrics: Dict[str, object] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }
    if y_score is not None:
        metrics["roc_auc"] = _safe_roc_auc(y_true, y_score)
    else:
        metrics["roc_auc"] = None
    return metrics


def normalize_sentiment_label(label: str) -> int:
    normalized = label.strip().lower()
    if normalized in {"positive", "pos", "1", "true"}:
        return 1
    if normalized in {"negative", "neg", "0", "false"}:
        return 0
    raise ValueError(f"Unsupported sentiment label: {label}")


def normalize_authenticity_label(label: str) -> int:
    normalized = str(label).strip().lower()
    if normalized in {"fake", "suspicious", "1", "true", "yes"}:
        return 1
    if normalized in {"authentic", "genuine", "0", "false", "no"}:
        return 0
    raise ValueError(f"Unsupported authenticity label: {label}")
