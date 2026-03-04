import { useState, useCallback, useRef } from "react";

/**
 * Hook for managing OCR pause/resume state.
 * Extracted from useAnalysis for better maintainability.
 */
export function useOcrState() {
  const [pausedOcrText, setPausedOcrText] = useState("");
  const [pausedOcrRemainingScreenshots, setPausedOcrRemainingScreenshots] = useState([]);
  const [pausedOcrTotalScreenshots, setPausedOcrTotalScreenshots] = useState(0);
  const [pausedOcrCompletedScreenshots, setPausedOcrCompletedScreenshots] = useState(0);

  const ocrPauseRequestedRef = useRef(false);
  const ocrTerminatedRef = useRef(false);
  const ocrUiThrottleRef = useRef({ t: 0, p: -1 });

  const resetOcrState = useCallback(() => {
    setPausedOcrText("");
    setPausedOcrRemainingScreenshots([]);
    setPausedOcrTotalScreenshots(0);
    setPausedOcrCompletedScreenshots(0);
    ocrTerminatedRef.current = false;
    ocrPauseRequestedRef.current = false;
  }, []);

  const hasPausedOcr = pausedOcrText.length > 0;

  return {
    pausedOcrText,
    setPausedOcrText,
    pausedOcrRemainingScreenshots,
    setPausedOcrRemainingScreenshots,
    pausedOcrTotalScreenshots,
    setPausedOcrTotalScreenshots,
    pausedOcrCompletedScreenshots,
    setPausedOcrCompletedScreenshots,
    ocrPauseRequestedRef,
    ocrTerminatedRef,
    ocrUiThrottleRef,
    resetOcrState,
    hasPausedOcr,
  };
}
