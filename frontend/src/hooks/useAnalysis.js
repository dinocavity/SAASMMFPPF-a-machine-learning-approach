import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useOcr } from "./useOcr";
import { usePhaseProgress } from "./usePhaseProgress";
import { useCaptureState } from "./useCaptureState";
import { useOcrState } from "./useOcrState";
import { usePlatformDetection } from "./usePlatformDetection";
import { ACTION_TYPES, PHASES, FRAUD_MODEL_IDS, SENTIMENT_MODEL_IDS } from "@/lib/constants";

const DISABLED_MODELS_KEY = "saasmmfppf_disabled_models";

function loadDisabledModels() {
  try {
    const raw = localStorage.getItem(DISABLED_MODELS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useAnalysis() {
  const { toast } = useToast();
  const ocr = useOcr();

  // Use extracted hooks for better maintainability
  const phaseState = usePhaseProgress();
  const captureState = useCaptureState();
  const ocrState = useOcrState();
  const platformState = usePlatformDetection();

  const [results, setResults] = useState(null);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Model toggle state (persisted in localStorage)
  const [disabledModels, setDisabledModels] = useState(() => loadDisabledModels());

  useEffect(() => {
    try {
      localStorage.setItem(DISABLED_MODELS_KEY, JSON.stringify(disabledModels));
    } catch {
      // localStorage unavailable
    }
  }, [disabledModels]);

  const toggleModel = useCallback((modelId) => {
    setDisabledModels((prev) => {
      const isCurrentlyDisabled = prev.includes(modelId);
      if (isCurrentlyDisabled) {
        // Re-enable: just remove from list
        return prev.filter((id) => id !== modelId);
      }
      // Disabling: check minimum constraints
      const nextDisabled = [...prev, modelId];
      const enabledFraud = FRAUD_MODEL_IDS.filter((id) => !nextDisabled.includes(id));
      const enabledSentiment = SENTIMENT_MODEL_IDS.filter((id) => !nextDisabled.includes(id));
      if (enabledFraud.length < 1) {
        toast.error("At least 1 fraud model must remain enabled");
        return prev;
      }
      if (enabledSentiment.length < 1) {
        toast.error("At least 1 sentiment model must remain enabled");
        return prev;
      }
      return nextDisabled;
    });
  }, [toast]);

  // Product name state
  const [productName, setProductName] = useState(null);
  const productNameRef = useRef(null);

  // Page URL state
  const [pageUrl, setPageUrl] = useState(null);
  const [analysisSource, setAnalysisSource] = useState({ url: null, productName: null });
  const analysisSourceRef = useRef({ url: null, productName: null });
  const startUrlRef = useRef(null);

  const reset = useCallback(() => {
    setResults(null);
    setLoading(false);
    setError("");
    setResultsSaved(false);
    setProductName(null);
    productNameRef.current = null;
    setPageUrl(null);
    setAnalysisSource({ url: null, productName: null });
    analysisSourceRef.current = { url: null, productName: null };
    phaseState.resetPhase();
    captureState.resetCapture();
    ocrState.resetOcrState();
    ocr.reset();
  }, [ocr, phaseState, captureState, ocrState]);

  // Timer for elapsed time (extended to include OCR loading)
  useEffect(() => {
    if (!captureState.autoFlowActive && !ocr.loading) {
      captureState.setElapsed(0);
      return;
    }

    const start = Date.now();
    const timer = setInterval(() => {
      captureState.setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [captureState.autoFlowActive, ocr.loading]);

  // Chrome extension message listener
  useEffect(() => {
    if (!chrome?.runtime?.onMessage) return;

    const handler = (message) => {
      if (message.action === ACTION_TYPES.ANALYSIS_SCROLLING) {
        if (captureState.scrollTimeoutRef.current) {
          clearTimeout(captureState.scrollTimeoutRef.current);
        }
        captureState.scrollTimeoutRef.current = setTimeout(() => {
          if (captureState.autoFlowActiveRef.current && phaseState.phaseRef.current === PHASES.SCROLLING) {
            const messageText = "Capture timed out while waiting for reviews. Try again.";
            setError(messageText);
            captureState.setAutoFlowStatus(messageText);
            captureState.setAutoFlowActive(false);
            phaseState.setPhaseState(PHASES.ERROR, 0, messageText);
            toast.error(messageText);
          }
        }, 30000);
      }

      if (message.action === ACTION_TYPES.ANALYSIS_PROGRESS) {
        if (captureState.scrollTimeoutRef.current) {
          clearTimeout(captureState.scrollTimeoutRef.current);
          captureState.scrollTimeoutRef.current = null;
        }
        captureState.setAutoFlowActive(true);
        captureState.setAutoFlowProgress(message.current || 0);
        captureState.setAutoFlowTotal(message.total || 0);
        captureState.setAutoFlowStatus(
          `Captured ${message.current || 0}/${message.total || 0} screenshots`
        );
        phaseState.setPhase(PHASES.CAPTURING);
        const cur = message.current || 0;
        const tot = message.total || 1;
        const currentPage = Number.isFinite(message.page)
          ? message.page
          : Math.max(captureState.capturedPageCount, 0) + 1;
        const targetPages =
          captureState.selectedPages === Infinity
            ? Number.isFinite(message.pageTotal)
              ? message.pageTotal
              : captureState.detectedPages && captureState.detectedPages > 0
                ? captureState.detectedPages
                : null
            : Number.isFinite(message.pageTotal)
              ? message.pageTotal
              : captureState.selectedPages;
        phaseState.setPhaseProgress(Math.round((cur / tot) * 100));
        const pageDetail = captureState.selectedPages === Infinity || !Number.isFinite(message.pageTotal)
          ? `Page ${currentPage}`
          : `Page ${currentPage} of ${targetPages || "?"}`;
        phaseState.setPhaseDetail(
          `Capturing screenshot ${cur} (up to ${tot}) • ${pageDetail}`
        );
      }

      if (message.action === ACTION_TYPES.ANALYSIS_SCREENSHOTS) {
        if (captureState.scrollTimeoutRef.current) {
          clearTimeout(captureState.scrollTimeoutRef.current);
          captureState.scrollTimeoutRef.current = null;
        }
        const shots = message.screenshots || [];
        if (!shots.length) {
          captureState.setAutoFlowStatus("No screenshots captured.");
          captureState.setAutoFlowActive(false);
          return;
        }
        if (captureState.cancelRef.current) {
          captureState.setAutoFlowStatus("Analysis cancelled.");
          captureState.setAutoFlowActive(false);
          return;
        }
        captureState.setAutoFlowStatus("Running OCR on captured screenshots...");
        phaseState.setPhaseState(PHASES.OCR, 0, "Starting OCR...");
        if (typeof message.pagesCaptured === "number") {
          captureState.setPagesCaptured(message.pagesCaptured);
        } else {
          captureState.setPagesCaptured(1);
        }
        if (Array.isArray(message.pageScreenshotCounts)) {
          captureState.setPageScreenshotCounts(message.pageScreenshotCounts);
        } else if (shots.length) {
          captureState.setPageScreenshotCounts([shots.length]);
        }
        runOcrFlow(shots);
      }

      if (message.action === ACTION_TYPES.ANALYSIS_PAGE_COMPLETE) {
        if (captureState.scrollTimeoutRef.current) {
          clearTimeout(captureState.scrollTimeoutRef.current);
          captureState.scrollTimeoutRef.current = null;
        }
        captureState.setPagePaused(true);
        captureState.setCapturedPageCount(message.page || 1);
        captureState.setCapturedScreenshotCount(message.totalScreenshots || 0);
        if (typeof message.page === "number") {
          captureState.setPagesCaptured(message.page);
        }
        if (typeof message.pageScreenshotCount === "number") {
          captureState.setPageScreenshotCounts((prev) => {
            const next = [...prev];
            next[(message.page || 1) - 1] = message.pageScreenshotCount;
            return next;
          });
        }
        captureState.setAutoFlowStatus(
          `Page ${message.page || 1} captured (${message.totalScreenshots || 0} screenshots)`
        );
        const targetPages =
          captureState.selectedPages === Infinity
            ? captureState.detectedPages && captureState.detectedPages > 0
              ? captureState.detectedPages
              : null
            : captureState.selectedPages;
        phaseState.setPhaseDetail(
          `Page ${message.page || 1} of ${targetPages || "?"} captured`
        );
      }

      if (message.action === ACTION_TYPES.ANALYSIS_STOPPED) {
        if (captureState.scrollTimeoutRef.current) {
          clearTimeout(captureState.scrollTimeoutRef.current);
          captureState.scrollTimeoutRef.current = null;
        }
        captureState.setAutoFlowStatus("Analysis stopped.");
        captureState.setAutoFlowActive(false);
        captureState.setAutoFlowProgress(0);
        captureState.setAutoFlowTotal(0);
        captureState.cancelRef.current = true;
        ocrState.ocrPauseRequestedRef.current = false;
        phaseState.resetPhase();
      }

      if (message.action === ACTION_TYPES.ANALYSIS_ERROR) {
        if (captureState.scrollTimeoutRef.current) {
          clearTimeout(captureState.scrollTimeoutRef.current);
          captureState.scrollTimeoutRef.current = null;
        }
        const messageText = message.message || "Failed to find review section.";
        setError(messageText);
        captureState.setAutoFlowStatus(messageText);
        captureState.setAutoFlowActive(false);
        phaseState.setPhaseState(PHASES.ERROR, 0, messageText);
        toast.error(messageText);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [captureState, phaseState, ocrState, toast]);

  // Tab-change detection — silently reset when idle
  useEffect(() => {
    if (!chrome?.runtime?.onMessage) return;

    const handler = (message) => {
      if (message.action !== ACTION_TYPES.TAB_CHANGED) return;

      platformState.setCurrentTabUrl(message.url);

      // Only reset when NOT actively working
      const isIdle =
        !captureState.autoFlowActiveRef.current && !ocr.loading && !captureState.pagePaused;
      if (isIdle) {
        reset();
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [ocr.loading, captureState.pagePaused, reset, platformState]);

  const fetchProductName = useCallback((options = {}) => {
    const { expectedUrl = null, lockForAnalysis = false } = options;
    return new Promise((resolve) => {
      if (!chrome?.runtime?.sendMessage) {
        resolve({ productName: null, pageUrl: null });
        return;
      }

      chrome.runtime.sendMessage(
        { action: ACTION_TYPES.GET_PRODUCT_NAME },
        (response) => {
          const name = response?.productName || null;
          const url = response?.pageUrl || null;
          const shouldAccept = !lockForAnalysis || (expectedUrl && url === expectedUrl);
          if (shouldAccept) {
            setProductName(name);
            productNameRef.current = name;
            setPageUrl(url);
            if (lockForAnalysis) {
              const nextSource = {
                url: url ?? analysisSourceRef.current.url,
                productName: name ?? analysisSourceRef.current.productName,
              };
              analysisSourceRef.current = nextSource;
              setAnalysisSource(nextSource);
            }
          }
          resolve({ productName: name, pageUrl: url });
        }
      );
    });
  }, []);

  const getActiveTabUrl = useCallback(() => {
    return new Promise((resolve) => {
      if (!chrome?.tabs?.query) {
        resolve(null);
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs[0]) {
          resolve(null);
          return;
        }
        resolve(tabs[0].url || null);
      });
    });
  }, []);

  const detectPages = useCallback(() => {
    return new Promise((resolve) => {
      if (!chrome?.runtime?.sendMessage) {
        captureState.setDetectedPages(1);
        captureState.setSelectedPages(1);
        resolve(1);
        return;
      }

      chrome.runtime.sendMessage(
        { action: ACTION_TYPES.DETECT_PAGES },
        (response) => {
          const pages = response?.totalPages || 1;
          captureState.setDetectedPages(pages);
          // For unknown (-1), default to 5 pages; otherwise 1
          captureState.setSelectedPages(pages === -1 ? 5 : Math.min(pages, 1));
          resolve(pages);
        }
      );
    });
  }, [captureState]);

  const analyzeText = useCallback(
    async (text) => {
      if (!text?.trim()) {
        setError("No review text found.");
        return null;
      }

      setLoading(true);
      setError("");
      setResults(null);
      setResultsSaved(false);
      phaseState.setPhaseState(PHASES.ANALYZING, 0, "Running ML models...");

      try {
        const payload = { text };
        if (disabledModels.length > 0) {
          payload.disabled_models = disabledModels;
        }
        const response = await api.post("/analyze", payload);
        setResults(response.data);
        captureState.setAutoFlowStatus("Analysis complete.");
        phaseState.setPhaseState(PHASES.COMPLETE, 100, "Analysis complete");
        toast.success("Analysis complete");
        return response.data;
      } catch (err) {
        const message = err.response?.data?.detail || "Failed to analyze review. Please try again.";
        setError(message);
        captureState.setAutoFlowStatus("Analysis failed.");
        phaseState.setPhaseState(PHASES.ERROR, 0, message);
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast, phaseState, captureState, disabledModels]
  );

  const runOcrFlow = useCallback(
    async (screenshots, options = {}) => {
      const { prefixText = "" } = options;
      const totalScreenshots = options.totalScreenshots ?? screenshots.length;
      const completedScreenshots = options.completedScreenshots ?? 0;
      try {
        const result = await ocr.processScreenshots(screenshots, (currentProgress, imageIndex, totalImages) => {
          const overallProgress = Math.round(
            ((completedScreenshots + (imageIndex - 1 + currentProgress / 100)) / totalScreenshots) * 100
          );
          const now = Date.now();
          const clamped = Math.min(Math.max(overallProgress, 2), 100);
          const last = ocrState.ocrUiThrottleRef.current;
          if (now - last.t > 150 || clamped !== last.p) {
            ocrState.ocrUiThrottleRef.current = { t: now, p: clamped };
            captureState.setAutoFlowStatus(`OCR progress: ${Math.min(overallProgress, 100)}%`);
            phaseState.setPhase(PHASES.OCR);
            phaseState.setPhaseProgress(clamped);
            phaseState.setPhaseDetail(`Processing image ${completedScreenshots + imageIndex} of ${totalScreenshots}`);
          }
        });

        const text = result?.text || "";
        const stoppedEarly = result?.stoppedEarly;
        const nextIndex = typeof result?.nextIndex === "number" ? result.nextIndex : screenshots.length;
        const nextCompleted = completedScreenshots + nextIndex;
        const combinedText = prefixText && text
          ? `${prefixText}\n\n${text}`
          : prefixText || text;

        if (captureState.cancelRef.current || !combinedText) {
          if (ocrState.ocrTerminatedRef.current) {
            ocrState.ocrTerminatedRef.current = false;
            captureState.setAutoFlowStatus("OCR terminated.");
            captureState.setAutoFlowActive(false);
            phaseState.setPhaseState(PHASES.IDLE, 0, "OCR terminated");
            return;
          }
          captureState.setAutoFlowStatus("Analysis cancelled.");
          captureState.setAutoFlowActive(false);
          phaseState.resetPhase();
          return;
        }

        // Store capture metadata
        captureState.setCaptureMetadata({
          totalPages: captureState.pagesCaptured || captureState.selectedPages,
          totalScreenshots: captureState.pageScreenshotCounts?.length
            ? captureState.pageScreenshotCounts.reduce((sum, count) => sum + (count || 0), 0)
            : screenshots.length,
          pageScreenshotCounts: captureState.pageScreenshotCounts,
          ocrTextLength: combinedText.length,
          ocrWordCount: combinedText.split(/\s+/).filter(Boolean).length,
          capturedTextPreview: combinedText.slice(0, 200),
          productName: productNameRef.current,
        });

        if (ocrState.ocrPauseRequestedRef.current) {
          ocrState.ocrPauseRequestedRef.current = false;
          ocrState.setPausedOcrText(combinedText);
          ocrState.setPausedOcrRemainingScreenshots(screenshots.slice(nextIndex));
          ocrState.setPausedOcrTotalScreenshots(totalScreenshots);
          ocrState.setPausedOcrCompletedScreenshots(nextCompleted);
          captureState.setAutoFlowStatus("OCR paused.");
          captureState.setAutoFlowActive(false);
          phaseState.setPhaseState(PHASES.IDLE, 0, "OCR paused");
          return;
        }

        captureState.setAutoFlowStatus(
          stoppedEarly
            ? "OCR stopped early. Running analysis..."
            : "OCR complete. Running analysis..."
        );
        await analyzeText(combinedText);
      } catch (err) {
        toast.error("OCR failed. Try again or use a clearer page.");
        phaseState.setPhaseState(PHASES.ERROR, 0, "OCR failed");
      } finally {
        captureState.setAutoFlowActive(false);
      }
    },
    [ocr, analyzeText, toast, captureState, ocrState, phaseState]
  );

  const startCapture = useCallback(
    async (pagesToCapture) => {
      const pages = pagesToCapture || captureState.selectedPages;
      captureState.setAutoFlowStatus("Starting review capture...");
      captureState.setAutoFlowActive(true);
      captureState.setAutoFlowProgress(0);
      captureState.setAutoFlowTotal(0);
      setResults(null);
      setResultsSaved(false);
      setError("");
      captureState.setCaptureMetadata(null);
      captureState.setPagePaused(false);
      captureState.setCapturedPageCount(0);
      captureState.setCapturedScreenshotCount(0);
      captureState.cancelRef.current = false;
      ocrState.ocrPauseRequestedRef.current = false;
      ocrState.ocrTerminatedRef.current = false;
      ocrState.resetOcrState();
      phaseState.setPhaseState(PHASES.SCROLLING, 0, "Scrolling to reviews...");

      if (captureState.scrollTimeoutRef.current) {
        clearTimeout(captureState.scrollTimeoutRef.current);
      }
      captureState.scrollTimeoutRef.current = setTimeout(() => {
        if (captureState.autoFlowActiveRef.current && phaseState.phaseRef.current === PHASES.SCROLLING) {
          const messageText = "Capture did not start. Try again or reload the page.";
          setError(messageText);
          captureState.setAutoFlowStatus(messageText);
          captureState.setAutoFlowActive(false);
          phaseState.setPhaseState(PHASES.ERROR, 0, messageText);
          toast.error(messageText);
        }
      }, 30000);

      // Capture source URL/name snapshot before starting capture
      const activeUrl = await getActiveTabUrl();
      const startUrl = activeUrl ?? platformState.currentTabUrl ?? pageUrl;
      const startName = productNameRef.current ?? productName;
      const initialSource = { url: startUrl, productName: startName };
      analysisSourceRef.current = initialSource;
      setAnalysisSource(initialSource);
      startUrlRef.current = startUrl;
      if (startName) {
        productNameRef.current = startName;
      }

      // Fetch product name before starting capture (lock to starting tab)
      if (startUrl) {
        await fetchProductName({ expectedUrl: startUrl, lockForAnalysis: true });
      } else {
        await fetchProductName();
      }

      const pagination =
        pages > 1 || pages === Infinity
          ? {
              enabled: true,
              maxPages: pages === Infinity ? 9999 : pages,
              pauseEachPage: false,
              totalPagesKnown:
                pages === Infinity
                  ? captureState.detectedPages && captureState.detectedPages > 1
                    ? captureState.detectedPages
                    : null
                  : pages,
            }
          : undefined;

      chrome.runtime.sendMessage(
        { action: ACTION_TYPES.START_ANALYSIS, pagination },
        () => {
          if (chrome.runtime.lastError) {
            captureState.setAutoFlowStatus("Failed to start capture.");
            captureState.setAutoFlowActive(false);
            toast.error("Failed to start capture");
          }
        }
      );
    },
    [toast, captureState, ocrState, phaseState, fetchProductName, pageUrl, productName, platformState, getActiveTabUrl]
  );

  const continueCapture = useCallback(() => {
    captureState.setPagePaused(false);
    captureState.setAutoFlowStatus("Continuing to next page...");
    chrome.runtime.sendMessage(
      { action: ACTION_TYPES.CONTINUE_PAGINATION },
      () => {
        if (chrome.runtime.lastError) {
          captureState.setAutoFlowStatus("Failed to continue capture.");
        }
      }
    );
  }, [captureState]);

  const pauseAfterPage = useCallback(() => {
    captureState.setAutoFlowStatus("Will pause after this page...");
    chrome.runtime.sendMessage(
      { action: ACTION_TYPES.PAUSE_AFTER_PAGE },
      () => {
        if (chrome.runtime.lastError) {
          captureState.setAutoFlowStatus("Failed to pause capture.");
        }
      }
    );
  }, [captureState]);

  const analyzeNow = useCallback(() => {
    captureState.setPagePaused(false);
    captureState.setAutoFlowStatus("Finishing current page before analyzing...");
    chrome.runtime.sendMessage(
      { action: ACTION_TYPES.ANALYZE_NOW },
      () => {
        if (chrome.runtime.lastError) {
          captureState.setAutoFlowStatus("Failed to trigger analysis.");
        }
      }
    );
  }, [captureState]);

  const analyzePausedOcr = useCallback(() => {
    if (!ocrState.pausedOcrText) return;
    const textToAnalyze = ocrState.pausedOcrText;
    ocrState.setPausedOcrText("");
    captureState.setAutoFlowStatus("Analyzing paused OCR...");
    analyzeText(textToAnalyze);
  }, [ocrState, analyzeText, captureState]);

  const resumeOcr = useCallback(() => {
    if (!ocrState.pausedOcrRemainingScreenshots.length) return;
    const prefixText = ocrState.pausedOcrText;
    const totalScreenshots = ocrState.pausedOcrTotalScreenshots || ocrState.pausedOcrRemainingScreenshots.length;
    const completedScreenshots = ocrState.pausedOcrCompletedScreenshots || 0;
    ocrState.resetOcrState();
    captureState.setAutoFlowActive(true);
    captureState.setAutoFlowStatus("Resuming OCR...");
    phaseState.setPhase(PHASES.OCR);
    phaseState.setPhaseProgress(Math.min(Math.max(Math.round((completedScreenshots / totalScreenshots) * 100), 2), 100));
    phaseState.setPhaseDetail("Resuming OCR...");
    runOcrFlow(ocrState.pausedOcrRemainingScreenshots, {
      prefixText,
      totalScreenshots,
      completedScreenshots,
    });
  }, [ocrState, captureState, phaseState, runOcrFlow]);

  const pauseOcr = useCallback(() => {
    if (!ocr.loading) return;
    ocrState.ocrPauseRequestedRef.current = true;
    ocr.stopAfterCurrent();
    captureState.setAutoFlowStatus("Pausing OCR after current image...");
    phaseState.setPhaseDetail("Pausing OCR");
  }, [ocr, ocrState, captureState, phaseState]);

  const terminateOcr = useCallback(() => {
    if (!ocr.loading) return;
    ocrState.ocrPauseRequestedRef.current = false;
    ocrState.ocrTerminatedRef.current = true;
    ocrState.resetOcrState();
    captureState.setAutoFlowStatus("OCR terminated.");
    captureState.setAutoFlowActive(false);
    phaseState.setPhaseState(PHASES.IDLE, 0, "OCR terminated");
    ocr.terminateNow();
  }, [ocr, ocrState, captureState, phaseState]);

  const stopAndAnalyze = useCallback(() => {
    if (ocr.loading) {
      captureState.setAutoFlowStatus("Stopping OCR after current image...");
      phaseState.setPhaseDetail("Stopping after current image");
      ocrState.ocrPauseRequestedRef.current = false;
      ocr.stopAfterCurrent();
      return;
    }

    if (captureState.autoFlowActive) {
      analyzeNow();
    }
  }, [ocr, captureState, phaseState, ocrState, analyzeNow]);

  const stopCapture = useCallback(() => {
    captureState.cancelRef.current = true;
    ocrState.ocrPauseRequestedRef.current = false;
    ocrState.resetOcrState();
    ocrState.ocrTerminatedRef.current = false;
    ocr.cancel();

    chrome.runtime.sendMessage({ action: ACTION_TYPES.STOP_ANALYSIS }, () => {
      if (chrome.runtime.lastError) {
        captureState.setAutoFlowStatus("Failed to stop capture.");
      } else {
        captureState.setAutoFlowStatus("Stopping...");
      }
    });
  }, [ocr, captureState, ocrState]);

  const terminateCapture = useCallback(() => {
    captureState.cancelRef.current = true;
    ocrState.ocrPauseRequestedRef.current = false;
    ocrState.ocrTerminatedRef.current = false;
    ocrState.resetOcrState();
    captureState.setAutoFlowActive(false);
    captureState.setAutoFlowStatus("Capture terminated.");
    captureState.setAutoFlowProgress(0);
    captureState.setAutoFlowTotal(0);
    phaseState.setPhaseState(PHASES.IDLE, 0, "Capture terminated");
    captureState.setPagePaused(false);
    ocr.cancel();

    chrome.runtime.sendMessage({ action: ACTION_TYPES.STOP_ANALYSIS }, () => {
      if (chrome.runtime.lastError) {
        captureState.setAutoFlowStatus("Failed to stop capture.");
      }
    });
  }, [ocr, captureState, ocrState, phaseState]);

  // Calculate overall progress percentage
  const progressPercent = ocr.loading
    ? ocr.progress
    : captureState.autoFlowTotal
      ? Math.round((captureState.autoFlowProgress / captureState.autoFlowTotal) * 100)
      : 0;

  return {
    results,
    loading,
    error,
    autoFlowActive: captureState.autoFlowActive,
    autoFlowStatus: captureState.autoFlowStatus,
    autoFlowProgress: captureState.autoFlowProgress,
    autoFlowTotal: captureState.autoFlowTotal,
    elapsed: captureState.elapsed,
    progressPercent,
    ocrLoading: ocr.loading,
    ocrProgress: ocr.progress,
    ocrError: ocr.error,
    detectedPages: captureState.detectedPages,
    selectedPages: captureState.selectedPages,
    setSelectedPages: captureState.setSelectedPages,
    captureMetadata: captureState.captureMetadata,
    productName,
    pageUrl,
    analysisSource,
    currentTabUrl: platformState.currentTabUrl,
    currentPlatform: platformState.currentPlatform,
    isSupportedPage: platformState.isSupportedPage,
    isOnSupportedDomain: platformState.isOnSupportedDomain,
    phase: phaseState.phase,
    phaseProgress: phaseState.phaseProgress,
    phaseDetail: phaseState.phaseDetail,
    pagePaused: captureState.pagePaused,
    capturedPageCount: captureState.capturedPageCount,
    capturedScreenshotCount: captureState.capturedScreenshotCount,
    pageScreenshotCounts: captureState.pageScreenshotCounts,
    pagesCaptured: captureState.pagesCaptured,
    detectPages,
    startCapture,
    stopCapture,
    terminateCapture,
    pauseAfterPage,
    pauseOcr,
    terminateOcr,
    continueCapture,
    analyzeNow,
    analyzePausedOcr,
    resumeOcr,
    stopAndAnalyze,
    analyzeText,
    fetchProductName,
    reset,
    resultsSaved,
    setResultsSaved,
    disabledModels,
    toggleModel,
    pausedOcrText: ocrState.pausedOcrText,
    setPausedOcrText: ocrState.setPausedOcrText,
    pausedOcrRemainingScreenshots: ocrState.pausedOcrRemainingScreenshots,
    setPausedOcrRemainingScreenshots: ocrState.setPausedOcrRemainingScreenshots,
    pausedOcrTotalScreenshots: ocrState.pausedOcrTotalScreenshots,
    pausedOcrCompletedScreenshots: ocrState.pausedOcrCompletedScreenshots,
  };
}
