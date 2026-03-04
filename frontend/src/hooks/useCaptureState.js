import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook for managing capture state during screenshot analysis.
 * Extracted from useAnalysis for better maintainability.
 */
export function useCaptureState() {
  const [autoFlowActive, setAutoFlowActive] = useState(false);
  const [autoFlowStatus, setAutoFlowStatus] = useState("");
  const [autoFlowProgress, setAutoFlowProgress] = useState(0);
  const [autoFlowTotal, setAutoFlowTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Page detection state
  const [detectedPages, setDetectedPages] = useState(null);
  const [selectedPages, setSelectedPages] = useState(1);
  const [captureMetadata, setCaptureMetadata] = useState(null);

  // Pause between pages state
  const [pagePaused, setPagePaused] = useState(false);
  const [capturedPageCount, setCapturedPageCount] = useState(0);
  const [capturedScreenshotCount, setCapturedScreenshotCount] = useState(0);
  const [pageScreenshotCounts, setPageScreenshotCounts] = useState([]);
  const [pagesCaptured, setPagesCaptured] = useState(0);

  const cancelRef = useRef(false);
  const autoFlowActiveRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    autoFlowActiveRef.current = autoFlowActive;
  }, [autoFlowActive]);

  // Timer for elapsed time
  useEffect(() => {
    if (!autoFlowActive) {
      setElapsed(0);
      return;
    }

    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [autoFlowActive]);

  const resetCapture = useCallback(() => {
    setAutoFlowActive(false);
    setAutoFlowStatus("");
    setAutoFlowProgress(0);
    setAutoFlowTotal(0);
    setElapsed(0);
    setDetectedPages(null);
    setSelectedPages(1);
    setCaptureMetadata(null);
    setPagePaused(false);
    setCapturedPageCount(0);
    setCapturedScreenshotCount(0);
    setPageScreenshotCounts([]);
    setPagesCaptured(0);
    cancelRef.current = false;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Calculate overall progress percentage
  const progressPercent = autoFlowTotal
    ? Math.round((autoFlowProgress / autoFlowTotal) * 100)
    : 0;

  return {
    autoFlowActive,
    setAutoFlowActive,
    autoFlowStatus,
    setAutoFlowStatus,
    autoFlowProgress,
    setAutoFlowProgress,
    autoFlowTotal,
    setAutoFlowTotal,
    elapsed,
    setElapsed,
    detectedPages,
    setDetectedPages,
    selectedPages,
    setSelectedPages,
    captureMetadata,
    setCaptureMetadata,
    pagePaused,
    setPagePaused,
    capturedPageCount,
    setCapturedPageCount,
    capturedScreenshotCount,
    setCapturedScreenshotCount,
    pageScreenshotCounts,
    setPageScreenshotCounts,
    pagesCaptured,
    setPagesCaptured,
    cancelRef,
    autoFlowActiveRef,
    scrollTimeoutRef,
    resetCapture,
    progressPercent,
  };
}
