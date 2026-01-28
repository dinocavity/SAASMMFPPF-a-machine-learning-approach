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
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
};
