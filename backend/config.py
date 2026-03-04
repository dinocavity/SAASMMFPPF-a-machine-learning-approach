"""
Configuration constants for the SAASMMFPPF backend.
Centralizes thresholds and limits for consistency across all models.
"""

import os

# Decision thresholds for fraud detection
# Using 0.6 as default based on empirical testing
FRAUD_DECISION_THRESHOLD = float(os.getenv("FRAUD_THRESHOLD", "0.6"))

# Blend weights for hybrid model (RoBERTa + heuristics)
FRAUD_BLEND_WEIGHTS = {
    "model": 0.7,
    "heuristic": 0.3,
}

# Input validation limits
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "50000"))  # characters
MIN_TEXT_LENGTH = 3  # minimum characters for meaningful analysis

# Rate limiting (requests per minute per IP)
RATE_LIMIT_RPM = int(os.getenv("RATE_LIMIT_RPM", "60"))

# Logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
