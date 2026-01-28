import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useOcr } from "./useOcr";
import { ACTION_TYPES } from "@/lib/constants";

export function useAnalysis() {
  const { token } = useAuth();
  const { toast } = useToast();
  const ocr = useOcr();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [autoFlowActive, setAutoFlowActive] = useState(false);
  const [autoFlowStatus, setAutoFlowStatus] = useState("");
  const [autoFlowProgress, setAutoFlowProgress] = useState(0);
  const [autoFlowTotal, setAutoFlowTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const cancelRef = useRef(false);

  // Timer for elapsed time
  useEffect(() => {
    if (!autoFlowActive && !ocr.loading) {
      setElapsed(0);
      return;
    }

    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [autoFlowActive, ocr.loading]);

  // Chrome extension message listener
  useEffect(() => {
    if (!chrome?.runtime?.onMessage) return;

    const handler = (message) => {
      if (message.action === ACTION_TYPES.ANALYSIS_PROGRESS) {
        setAutoFlowActive(true);
        setAutoFlowProgress(message.current || 0);
        setAutoFlowTotal(message.total || 0);
        setAutoFlowStatus(
          `Captured ${message.current || 0}/${message.total || 0} screenshots`
        );
      }

      if (message.action === ACTION_TYPES.ANALYSIS_SCREENSHOTS) {
        const shots = message.screenshots || [];
        if (!shots.length) {
          setAutoFlowStatus("No screenshots captured.");
          setAutoFlowActive(false);
          return;
        }
        if (cancelRef.current) {
          setAutoFlowStatus("Analysis cancelled.");
          setAutoFlowActive(false);
          return;
        }
        setAutoFlowStatus("Running OCR on captured screenshots...");
        runOcrFlow(shots);
      }

      if (message.action === ACTION_TYPES.ANALYSIS_STOPPED) {
        setAutoFlowStatus("Analysis stopped.");
        setAutoFlowActive(false);
        setAutoFlowProgress(0);
        setAutoFlowTotal(0);
        cancelRef.current = true;
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const analyzeText = useCallback(
    async (text) => {
      if (!text?.trim()) {
        setError("No review text found.");
        return null;
      }

      setLoading(true);
      setError("");
      setResults(null);

      try {
        const headers = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await api.post("/analyze", { text }, { headers });
        setResults(response.data);
        setAutoFlowStatus("Analysis complete.");
        toast.success("Analysis complete");
        return response.data;
      } catch (err) {
        const message = err.response?.data?.detail || "Failed to analyze review. Please try again.";
        setError(message);
        setAutoFlowStatus("Analysis failed.");
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token, toast]
  );

  const runOcrFlow = useCallback(
    async (screenshots) => {
      try {
        const text = await ocr.processScreenshots(screenshots, (progress) => {
          setAutoFlowStatus(`OCR progress: ${progress}%`);
        });

        if (cancelRef.current || !text) {
          setAutoFlowStatus("Analysis cancelled.");
          setAutoFlowActive(false);
          return;
        }

        setAutoFlowStatus("OCR complete. Running analysis...");
        await analyzeText(text);
      } catch (err) {
        toast.error("OCR failed. Try again or use a clearer page.");
      } finally {
        setAutoFlowActive(false);
      }
    },
    [ocr, analyzeText, toast]
  );

  const startCapture = useCallback(() => {
    setAutoFlowStatus("Starting review capture...");
    setAutoFlowActive(true);
    setAutoFlowProgress(0);
    setAutoFlowTotal(0);
    setResults(null);
    setError("");
    cancelRef.current = false;

    chrome.runtime.sendMessage({ action: ACTION_TYPES.START_ANALYSIS }, () => {
      if (chrome.runtime.lastError) {
        setAutoFlowStatus("Failed to start capture.");
        setAutoFlowActive(false);
        toast.error("Failed to start capture");
      }
    });
  }, [toast]);

  const stopCapture = useCallback(() => {
    cancelRef.current = true;
    ocr.cancel();

    chrome.runtime.sendMessage({ action: ACTION_TYPES.STOP_ANALYSIS }, () => {
      if (chrome.runtime.lastError) {
        setAutoFlowStatus("Failed to stop capture.");
      } else {
        setAutoFlowStatus("Stopping...");
      }
    });
  }, [ocr]);

  const reset = useCallback(() => {
    setResults(null);
    setLoading(false);
    setError("");
    setAutoFlowActive(false);
    setAutoFlowStatus("");
    setAutoFlowProgress(0);
    setAutoFlowTotal(0);
    setElapsed(0);
    cancelRef.current = false;
    ocr.reset();
  }, [ocr]);

  // Calculate overall progress percentage
  const progressPercent = ocr.loading
    ? ocr.progress
    : autoFlowTotal
      ? Math.round((autoFlowProgress / autoFlowTotal) * 100)
      : 0;

  return {
    results,
    loading,
    error,
    autoFlowActive,
    autoFlowStatus,
    autoFlowProgress,
    autoFlowTotal,
    elapsed,
    progressPercent,
    ocrLoading: ocr.loading,
    ocrProgress: ocr.progress,
    ocrError: ocr.error,
    startCapture,
    stopCapture,
    analyzeText,
    reset,
  };
}
