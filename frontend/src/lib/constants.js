export const TESSERACT_CONFIG = {
  baseUrl: import.meta.env.VITE_TESSERACT_BASE_URL || "/tesseract",
  langPath:
    import.meta.env.VITE_TESSERACT_LANG_PATH ||
    "https://tessdata.projectnaptha.com/4.0.0",
};

export const SIGNAL_EXPLANATIONS = {
  "linguistic-patterns": "Detected promotional phrases or excessive punctuation",
  "short-review": "Review is unusually short (<40 characters)",
  "excessive-caps": "Unusual capitalization patterns detected",
  "repetitive-phrases": "Contains repetitive or templated language",
  "suspicious-timing": "Review timing suggests coordinated activity",
  "generic-praise": "Uses generic, non-specific praise",
  "keyword-stuffing": "Contains unnaturally high keyword density",
  "sentiment-mismatch": "Sentiment doesn't match the rating given",
  "verified-purchase": "No verified purchase indicator",
  "new-account": "Posted from a recently created account",
};

export const ACTION_TYPES = {
  START_ANALYSIS: "startAutoAnalyze",
  STOP_ANALYSIS: "stopAutoAnalyze",
  ANALYSIS_PROGRESS: "analysisProgress",
  ANALYSIS_SCREENSHOTS: "analysisScreenshots",
  ANALYSIS_STOPPED: "analysisStopped",
  DETECT_PAGES: "detectPages",
  ANALYSIS_SCROLLING: "analysisScrolling",
  ANALYSIS_PAGE_PROGRESS: "analysisPageProgress",
  ANALYSIS_PAGE_COMPLETE: "analysisPageComplete",
  CONTINUE_PAGINATION: "continuePagination",
  ANALYZE_NOW: "analyzeNow",
  PAUSE_AFTER_PAGE: "pauseAfterPage",
  ANALYSIS_ERROR: "analysisError",
  GET_PRODUCT_NAME: "getProductName",
  TAB_CHANGED: "TAB_CHANGED",
};

export const PHASES = {
  IDLE: "idle",
  SCROLLING: "scrolling",
  CAPTURING: "capturing",
  OCR: "ocr",
  ANALYZING: "analyzing",
  COMPLETE: "complete",
  ERROR: "error",
};

export const PHASE_LABELS = {
  scrolling: "Scroll",
  capturing: "Capture",
  ocr: "OCR",
  analyzing: "Analyze",
  complete: "Done",
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
};

export const MODEL_IDS = [
  "fraud_api", "fraud_local_1", "fraud_local_2",
  "sentiment_api", "sentiment_local_1", "sentiment_local_2",
];

export const FRAUD_MODEL_IDS = ["fraud_api", "fraud_local_1", "fraud_local_2"];
export const SENTIMENT_MODEL_IDS = ["sentiment_api", "sentiment_local_1", "sentiment_local_2"];

export const MODEL_NAMES = {
  fraud_api: "HuggingFace API (RoBERTa)",
  fraud_local_1: "RoBERTa Transformer",
  fraud_local_2: "Random Forest (TF-IDF)",
  sentiment_api: "HuggingFace API (DistilBERT)",
  sentiment_local_1: "RoBERTa (Twitter)",
  sentiment_local_2: "SVM (TF-IDF)",
};

export const MODEL_SOURCES = {
  fraud_api: "api",
  fraud_local_1: "local",
  fraud_local_2: "local",
  sentiment_api: "api",
  sentiment_local_1: "local",
  sentiment_local_2: "local",
};

export const MODEL_DESCRIPTIONS = {
  api_fraud:
    "Uses a hosted transformer model via HuggingFace's Inference API. Text is tokenized and passed through a pre-trained deep neural network that classifies reviews based on patterns learned from large-scale datasets of real and fake reviews.",
  local_1_fraud:
    "Runs a local RoBERTa (Robustly Optimized BERT) transformer. It reads text bidirectionally to capture context, then combines the ML prediction with heuristic signal checks (keyword patterns, linguistic cues) for a blended confidence score.",
  local_2_fraud:
    "An ensemble of decision trees (Random Forest) operating on TF-IDF word features. Each tree independently votes on real vs. fake; the majority determines the result. Also applies keyword and linguistic heuristic overlays.",
  api_sentiment:
    "Sends text to a HuggingFace-hosted sentiment model. The transformer encoder produces class probabilities (positive / negative / neutral) and the highest-scoring class is returned as the verdict.",
  local_1_sentiment:
    "A locally-run RoBERTa transformer fine-tuned for sentiment analysis. It encodes full review context with self-attention layers and outputs a probability distribution over sentiment classes.",
  local_2_sentiment:
    "A Support Vector Machine (SVM) trained on TF-IDF features. It finds the optimal hyperplane separating sentiment classes in high-dimensional feature space, effective for clear-cut positive/negative text.",
};
