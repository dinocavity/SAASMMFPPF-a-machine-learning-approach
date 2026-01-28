import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Tesseract from "tesseract.js";

const defaultApiUrl = (typeof chrome !== "undefined" && chrome?.runtime?.id)
  ? "http://localhost:8000"
  : "";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
});

const TESSERACT_CONFIG = {
  baseUrl: import.meta.env.VITE_TESSERACT_BASE_URL || "/tesseract",
  langPath: import.meta.env.VITE_TESSERACT_LANG_PATH || "https://tessdata.projectnaptha.com/4.0.0",
};

const SIGNAL_LABELS = {
  "linguistic-patterns": "Promotional language detected",
  "short-review": "Unusually short review",
  "excessive-caps": "Excessive capitalization",
  "repetitive-phrases": "Repetitive phrases",
  "generic-praise": "Generic praise patterns",
};

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [pauseEachPage, setPauseEachPage] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!chrome?.runtime?.onMessage) return;

    const handler = (message) => {
      if (message.action === "analysisProgress") {
        setProgress(message.total ? (message.current / message.total) * 50 : 0);
        setStatus(`Capturing ${message.current}/${message.total}`);
      }

      if (message.action === "analysisScreenshots") {
        const shots = message.screenshots || [];
        if (!shots.length) {
          setStatus("");
          setLoading(false);
          setError("No reviews found on page");
          return;
        }
        if (cancelRef.current) {
          reset();
          return;
        }
        runOcr(shots);
      }

      if (message.action === "analysisPageComplete") {
        setPaused(true);
        setPageIndex(message.page || 1);
        setStatus(`Captured page ${message.page || 1}. Continue?`);
        return;
      }

      if (message.action === "analysisError") {
        setStatus("");
        setLoading(false);
        setError(message.message || "Capture failed");
        return;
      }

      if (message.action === "analysisStopped") {
        reset();
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const reset = () => {
    setLoading(false);
    setStatus("");
    setProgress(0);
    setPaused(false);
    setPageIndex(1);
    cancelRef.current = false;
  };

  const runOcr = async (screenshots) => {
    setStatus("Extracting text...");
    const texts = [];

    try {
      for (let i = 0; i < screenshots.length; i++) {
        if (cancelRef.current) {
          reset();
          return;
        }

        const result = await Tesseract.recognize(screenshots[i], "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              const ocrProgress = 50 + ((i + m.progress) / screenshots.length) * 40;
              setProgress(ocrProgress);
            }
          },
          workerBlobURL: false,
          workerPath: `${TESSERACT_CONFIG.baseUrl}/worker.min.js`,
          corePath: `${TESSERACT_CONFIG.baseUrl}/tesseract-core.wasm.js`,
          langPath: TESSERACT_CONFIG.langPath,
        });
        texts.push(result.data.text.trim());
      }

      const combined = texts.filter(Boolean).join("\n\n");
      if (!combined) {
        setError("Could not extract text");
        reset();
        return;
      }

      await analyze(combined);
    } catch (err) {
      setError("OCR failed");
      reset();
    }
  };

  const analyze = async (text) => {
    setStatus("Analyzing...");
    setProgress(95);

    try {
      const response = await api.post("/analyze", { text });
      setResults(response.data);
      setProgress(100);
      setStatus("");
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = () => {
    setLoading(true);
    setError("");
    setResults(null);
    setProgress(0);
    setStatus("Starting...");
    cancelRef.current = false;
    setPaused(false);

    chrome.runtime.sendMessage(
      {
        action: "startAutoAnalyze",
        pagination: {
          enabled: paginationEnabled,
          pauseEachPage: pauseEachPage,
        },
      },
      () => {
      if (chrome.runtime.lastError) {
        setError("Extension error");
        reset();
      }
    });
  };

  const stopAnalysis = () => {
    cancelRef.current = true;
    chrome.runtime.sendMessage({ action: "stopAutoAnalyze" });
    reset();
  };

  const continueAnalysis = () => {
    setPaused(false);
    setStatus("Continuing...");
    chrome.runtime.sendMessage({ action: "continuePagination" });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Review Analyzer</h1>
        <p>Detect fake reviews automatically</p>
      </header>

      <div className="card">
        {loading ? (
          <>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="status-text">{status}</p>
            {paused ? (
              <button className="btn btn-primary" onClick={continueAnalysis} style={{ marginTop: 12 }}>
                Continue
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopAnalysis} style={{ marginTop: 12 }}>
                Cancel
              </button>
            )}
          </>
        ) : (
          <button className="btn btn-primary" onClick={startAnalysis}>
            Analyze Reviews
          </button>
        )}

        {!loading && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={paginationEnabled}
                onChange={(e) => setPaginationEnabled(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Paginate reviews
            </label>
            {paginationEnabled && (
              <label style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={pauseEachPage}
                  onChange={(e) => setPauseEachPage(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Pause after each page
              </label>
            )}
          </div>
        )}

        {error && (
          <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12, textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>

      {results && <ResultsView results={results} />}

      {!results && !loading && (
        <div className="empty-state">
          <p>Navigate to a product page and click "Analyze Reviews"</p>
        </div>
      )}
    </div>
  );
}

function ResultsView({ results }) {
  const { sentiment_api, sentiment_custom, authenticity } = results;

  const getSentimentStyle = (sentiment) => {
    if (sentiment === "positive") return "success";
    if (sentiment === "negative") return "danger";
    return "neutral";
  };

  const formatConfidence = (val) => {
    if (val == null) return "";
    return `${Math.round(val * 100)}%`;
  };

  return (
    <div className="card">
      <h3 className="card-title">Results</h3>

      {/* Authenticity - Most Important */}
      <div className={`result-item ${authenticity?.is_fake ? "danger" : "success"}`}>
        <div className="result-label">Authenticity</div>
        <div className="result-value">
          <span>{authenticity?.is_fake ? "Likely Fake" : "Likely Authentic"}</span>
          <span className="confidence">{formatConfidence(authenticity?.confidence)}</span>
        </div>
        {authenticity?.signals?.length > 0 && (
          <div className="signals-list">
            {authenticity.signals.map((signal, i) => (
              <div key={i} className="signal-item">
                {SIGNAL_LABELS[signal] || signal}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sentiment API */}
      <div className={`result-item ${getSentimentStyle(sentiment_api?.sentiment)}`}>
        <div className="result-label">Sentiment (API)</div>
        <div className="result-value">
          <span style={{ textTransform: "capitalize" }}>{sentiment_api?.sentiment || "N/A"}</span>
          <span className="confidence">{formatConfidence(sentiment_api?.confidence)}</span>
        </div>
      </div>

      {/* Sentiment Custom */}
      <div className={`result-item ${getSentimentStyle(sentiment_custom?.sentiment)}`}>
        <div className="result-label">Sentiment (Local)</div>
        <div className="result-value">
          <span style={{ textTransform: "capitalize" }}>{sentiment_custom?.sentiment || "N/A"}</span>
          <span className="confidence">{formatConfidence(sentiment_custom?.confidence)}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
