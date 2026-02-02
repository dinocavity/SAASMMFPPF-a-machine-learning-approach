import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useOcr } from "./useOcr";
import { ACTION_TYPES, PHASES } from "@/lib/constants";

export function useAnalysis() {
  const { toast } = useToast();
  const ocr = useOcr();

  const [results, setResults] = useState(null);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  const [pausedOcrText, setPausedOcrText] = useState("");
  const [pausedOcrRemainingScreenshots, setPausedOcrRemainingScreenshots] = useState([]);
  const [pausedOcrTotalScreenshots, setPausedOcrTotalScreenshots] = useState(0);
  const [pausedOcrCompletedScreenshots, setPausedOcrCompletedScreenshots] = useState(0);
  const ocrPauseRequestedRef = useRef(false);
  const ocrTerminatedRef = useRef(false);

  // Product name state
  const [productName, setProductName] = useState(null);
  const productNameRef = useRef(null);

  // Page URL state
  const [pageUrl, setPageUrl] = useState(null);
  const [analysisSource, setAnalysisSource] = useState({ url: null, productName: null });

  // Current tab URL & supported-page detection
  const [currentTabUrl, setCurrentTabUrl] = useState(null);

  // Phase progress state
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseDetail, setPhaseDetail] = useState("");

  const cancelRef = useRef(false);
  const autoFlowActiveRef = useRef(false);
  const phaseRef = useRef(PHASES.IDLE);
  const scrollTimeoutRef = useRef(null);
  const ocrUiThrottleRef = useRef({ t: 0, p: -1 });

  // Supported-domain check
  const SUPPORTED_DOMAINS = [
    'shopee.ph', 'shopee.com',
    'lazada.com', 'lazada.sg', 'lazada.com.ph',
    'lazada.vn', 'lazada.co.id', 'lazada.co.th', 'lazada.com.my',
    'amazon.com', 'amazon.com.ph', 'amazon.sg', 'amazon.co.jp',
    'tiktok.com',
  ];

  const isSupportedDomain = useCallback((url) => {
    if (!url) return false;
    if (/^(chrome|edge|about|chrome-extension):/.test(url)) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return SUPPORTED_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith('.' + d)
      );
    } catch { return false; }
  }, []);

  const isProductPage = useCallback((url) => {
    if (!url || !isSupportedDomain(url)) return false;
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();

      // Shopee product pages: contain "-i." followed by shop_id.item_id
      if (SUPPORTED_DOMAINS.some((d) => (d.startsWith('shopee') && (hostname === d || hostname.endsWith('.' + d))))) {
        return /-i\.\d+\.\d+/.test(pathname);
      }

      // Lazada product pages: /products/ path or -i<item_id> pattern
      if (SUPPORTED_DOMAINS.some((d) => (d.startsWith('lazada') && (hostname === d || hostname.endsWith('.' + d))))) {
        return /\/products\//.test(pathname) || /-i\d+/.test(pathname);
      }

      // Amazon product pages: /dp/ or /gp/product/ in pathname
      if (SUPPORTED_DOMAINS.some((d) => (d.startsWith('amazon') && (hostname === d || hostname.endsWith('.' + d))))) {
        return /\/dp\//.test(pathname) || /\/gp\/product\//.test(pathname);
      }

      // TikTok Shop product pages: /product/ or /shop/.../pdp/ in pathname
      if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
        return /\/product\//.test(pathname) || /\/shop\/.+\/pdp\//.test(pathname) || /\/pdp\//.test(pathname);
      }

      return false;
    } catch { return false; }
  }, [isSupportedDomain]);

  const isSupportedUrl = useCallback((url) => {
    return isSupportedDomain(url);
  }, [isSupportedDomain]);

  const getPlatformFromUrl = useCallback((url) => {
    if (!url) return null;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (SUPPORTED_DOMAINS.some((d) => d.startsWith('shopee') && (hostname === d || hostname.endsWith('.' + d)))) return 'shopee';
      if (SUPPORTED_DOMAINS.some((d) => d.startsWith('lazada') && (hostname === d || hostname.endsWith('.' + d)))) return 'lazada';
      if (SUPPORTED_DOMAINS.some((d) => d.startsWith('amazon') && (hostname === d || hostname.endsWith('.' + d)))) return 'amazon';
      if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'tiktok';
      return null;
    } catch { return null; }
  }, []);

  const currentPlatform = useMemo(
    () => getPlatformFromUrl(currentTabUrl),
    [currentTabUrl, getPlatformFromUrl]
  );

  const reset = useCallback(() => {
    setResults(null);
    setLoading(false);
    setError("");
    setResultsSaved(false);
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
    setPausedOcrText("");
    setPausedOcrRemainingScreenshots([]);
    setPausedOcrTotalScreenshots(0);
    setPausedOcrCompletedScreenshots(0);
    ocrTerminatedRef.current = false;
    ocrPauseRequestedRef.current = false;
    setProductName(null);
    productNameRef.current = null;
    setPageUrl(null);
    setAnalysisSource({ url: null, productName: null });
    setPhase(PHASES.IDLE);
    setPhaseProgress(0);
    setPhaseDetail("");
    cancelRef.current = false;
    ocr.reset();
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, [ocr]);

  const isSupportedPage = useMemo(
    () => currentTabUrl === null ? true : isProductPage(currentTabUrl),
    [currentTabUrl, isProductPage]
  );

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

  useEffect(() => {
    autoFlowActiveRef.current = autoFlowActive;
  }, [autoFlowActive]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Chrome extension message listener
  useEffect(() => {
    if (!chrome?.runtime?.onMessage) return;

    const handler = (message) => {
      if (message.action === ACTION_TYPES.ANALYSIS_SCROLLING) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          if (autoFlowActiveRef.current && phaseRef.current === PHASES.SCROLLING) {
            const messageText = "Capture timed out while waiting for reviews. Try again.";
            setError(messageText);
            setAutoFlowStatus(messageText);
            setAutoFlowActive(false);
            setPhase(PHASES.ERROR);
            setPhaseProgress(0);
            setPhaseDetail(messageText);
            toast.error(messageText);
          }
        }, 30000);
      }

      if (message.action === ACTION_TYPES.ANALYSIS_PROGRESS) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        setAutoFlowActive(true);
        setAutoFlowProgress(message.current || 0);
        setAutoFlowTotal(message.total || 0);
        setAutoFlowStatus(
          `Captured ${message.current || 0}/${message.total || 0} screenshots`
        );
        setPhase(PHASES.CAPTURING);
        const cur = message.current || 0;
        const tot = message.total || 1;
        const currentPage = Number.isFinite(message.page)
          ? message.page
          : Math.max(capturedPageCount, 0) + 1;
        const targetPages =
          selectedPages === Infinity
            ? Number.isFinite(message.pageTotal)
              ? message.pageTotal
              : detectedPages && detectedPages > 0
                ? detectedPages
                : null
            : Number.isFinite(message.pageTotal)
              ? message.pageTotal
              : selectedPages;
        setPhaseProgress(Math.round((cur / tot) * 100));
        const pageDetail = selectedPages === Infinity || !Number.isFinite(message.pageTotal)
          ? `Page ${currentPage}`
          : `Page ${currentPage} of ${targetPages || "?"}`;
        setPhaseDetail(
          `Capturing screenshot ${cur} (up to ${tot}) • ${pageDetail}`
        );
      }

      if (message.action === ACTION_TYPES.ANALYSIS_SCREENSHOTS) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
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
        setPhase(PHASES.OCR);
        setPhaseProgress(0);
        setPhaseDetail("Starting OCR...");
        if (typeof message.pagesCaptured === "number") {
          setPagesCaptured(message.pagesCaptured);
        } else {
          setPagesCaptured(1);
        }
        if (Array.isArray(message.pageScreenshotCounts)) {
          setPageScreenshotCounts(message.pageScreenshotCounts);
        } else if (shots.length) {
          setPageScreenshotCounts([shots.length]);
        }
        runOcrFlow(shots);
      }

      if (message.action === ACTION_TYPES.ANALYSIS_PAGE_COMPLETE) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        setPagePaused(true);
        setCapturedPageCount(message.page || 1);
        setCapturedScreenshotCount(message.totalScreenshots || 0);
        if (typeof message.page === "number") {
          setPagesCaptured(message.page);
        }
        if (typeof message.pageScreenshotCount === "number") {
          setPageScreenshotCounts((prev) => {
            const next = [...prev];
            next[(message.page || 1) - 1] = message.pageScreenshotCount;
            return next;
          });
        }
        setAutoFlowStatus(
          `Page ${message.page || 1} captured (${message.totalScreenshots || 0} screenshots)`
        );
        const targetPages =
          selectedPages === Infinity
            ? detectedPages && detectedPages > 0
              ? detectedPages
              : null
            : selectedPages;
        setPhaseDetail(
          `Page ${message.page || 1} of ${targetPages || "?"} captured`
        );
      }

      if (message.action === ACTION_TYPES.ANALYSIS_STOPPED) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        setAutoFlowStatus("Analysis stopped.");
        setAutoFlowActive(false);
        setAutoFlowProgress(0);
        setAutoFlowTotal(0);
        cancelRef.current = true;
        ocrPauseRequestedRef.current = false;
        setPhase(PHASES.IDLE);
        setPhaseProgress(0);
        setPhaseDetail("");
      }
      if (message.action === ACTION_TYPES.ANALYSIS_ERROR) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        const messageText = message.message || "Failed to find review section.";
        setError(messageText);
        setAutoFlowStatus(messageText);
        setAutoFlowActive(false);
        setPhase(PHASES.ERROR);
        setPhaseProgress(0);
        setPhaseDetail(messageText);
        toast.error(messageText);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  // Tab-change detection — silently reset when idle
  useEffect(() => {
    if (!chrome?.runtime?.onMessage) return;

    const handler = (message) => {
      if (message.action !== ACTION_TYPES.TAB_CHANGED) return;

      setCurrentTabUrl(message.url);

      // Only reset when NOT actively working
      const isIdle =
        !autoFlowActiveRef.current && !ocr.loading && !pagePaused;
      if (isIdle) {
        reset();
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [ocr.loading, pagePaused, reset]);

  // Initialize current tab URL on mount
  useEffect(() => {
    if (!chrome?.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) return;
      setCurrentTabUrl(tabs[0].url);
    });
  }, []);

  const fetchProductName = useCallback(() => {
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
          setProductName(name);
          productNameRef.current = name;
          setPageUrl(url);
          resolve({ productName: name, pageUrl: url });
        }
      );
    });
  }, []);

  const detectPages = useCallback(() => {
    return new Promise((resolve) => {
      if (!chrome?.runtime?.sendMessage) {
        setDetectedPages(1);
        setSelectedPages(1);
        resolve(1);
        return;
      }

      chrome.runtime.sendMessage(
        { action: ACTION_TYPES.DETECT_PAGES },
        (response) => {
          const pages = response?.totalPages || 1;
          setDetectedPages(pages);
          // For unknown (-1), default to 5 pages; otherwise 1
          setSelectedPages(pages === -1 ? 5 : Math.min(pages, 1));
          resolve(pages);
        }
      );
    });
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
      setResultsSaved(false);
      setPhase(PHASES.ANALYZING);
      setPhaseProgress(0);
      setPhaseDetail("Running ML models...");

      try {
        const response = await api.post("/analyze", { text });
        setResults(response.data);
        setAutoFlowStatus("Analysis complete.");
        setPhase(PHASES.COMPLETE);
        setPhaseProgress(100);
        setPhaseDetail("Analysis complete");
        toast.success("Analysis complete");
        return response.data;
      } catch (err) {
        const message = err.response?.data?.detail || "Failed to analyze review. Please try again.";
        setError(message);
        setAutoFlowStatus("Analysis failed.");
        setPhase(PHASES.ERROR);
        setPhaseProgress(0);
        setPhaseDetail(message);
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
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
          const last = ocrUiThrottleRef.current;
          if (now - last.t > 150 || clamped !== last.p) {
            ocrUiThrottleRef.current = { t: now, p: clamped };
            setAutoFlowStatus(`OCR progress: ${Math.min(overallProgress, 100)}%`);
            setPhase(PHASES.OCR);
            setPhaseProgress(clamped);
            setPhaseDetail(`Processing image ${completedScreenshots + imageIndex} of ${totalScreenshots}`);
          }
        });

        const text = result?.text || "";
        const stoppedEarly = result?.stoppedEarly;
        const nextIndex = typeof result?.nextIndex === "number" ? result.nextIndex : screenshots.length;
        const nextCompleted = completedScreenshots + nextIndex;
        const combinedText = prefixText && text
          ? `${prefixText}\n\n${text}`
          : prefixText || text;

        if (cancelRef.current || !combinedText) {
          if (ocrTerminatedRef.current) {
            ocrTerminatedRef.current = false;
            setAutoFlowStatus("OCR terminated.");
            setAutoFlowActive(false);
            setPhase(PHASES.IDLE);
            setPhaseProgress(0);
            setPhaseDetail("OCR terminated");
            return;
          }
          setAutoFlowStatus("Analysis cancelled.");
          setAutoFlowActive(false);
          setPhase(PHASES.IDLE);
          setPhaseProgress(0);
          setPhaseDetail("");
          return;
        }

        // Store capture metadata
        setCaptureMetadata({
          totalPages: pagesCaptured || selectedPages,
          totalScreenshots: pageScreenshotCounts?.length
            ? pageScreenshotCounts.reduce((sum, count) => sum + (count || 0), 0)
            : screenshots.length,
          pageScreenshotCounts,
          ocrTextLength: combinedText.length,
          ocrWordCount: combinedText.split(/\s+/).filter(Boolean).length,
          capturedTextPreview: combinedText.slice(0, 200),
          productName: productNameRef.current,
        });

        if (ocrPauseRequestedRef.current) {
          ocrPauseRequestedRef.current = false;
          setPausedOcrText(combinedText);
          setPausedOcrRemainingScreenshots(screenshots.slice(nextIndex));
          setPausedOcrTotalScreenshots(totalScreenshots);
          setPausedOcrCompletedScreenshots(nextCompleted);
          setAutoFlowStatus("OCR paused.");
          setAutoFlowActive(false);
          setPhase(PHASES.IDLE);
          setPhaseProgress(0);
          setPhaseDetail("OCR paused");
          return;
        }

        setAutoFlowStatus(
          stoppedEarly
            ? "OCR stopped early. Running analysis..."
            : "OCR complete. Running analysis..."
        );
        await analyzeText(combinedText);
      } catch (err) {
        toast.error("OCR failed. Try again or use a clearer page.");
        setPhase(PHASES.ERROR);
        setPhaseProgress(0);
        setPhaseDetail("OCR failed");
      } finally {
        setAutoFlowActive(false);
      }
    },
    [ocr, analyzeText, toast, selectedPages]
  );

  const startCapture = useCallback(
    async (pagesToCapture) => {
      const pages = pagesToCapture || selectedPages;
      setAutoFlowStatus("Starting review capture...");
      setAutoFlowActive(true);
      setAutoFlowProgress(0);
      setAutoFlowTotal(0);
      setResults(null);
      setResultsSaved(false);
      setError("");
      setCaptureMetadata(null);
      setPagePaused(false);
      setCapturedPageCount(0);
      setCapturedScreenshotCount(0);
      cancelRef.current = false;
      ocrPauseRequestedRef.current = false;
      ocrTerminatedRef.current = false;
      setPausedOcrText("");
      setPausedOcrRemainingScreenshots([]);
      setPausedOcrTotalScreenshots(0);
      setPausedOcrCompletedScreenshots(0);
      setPhase(PHASES.SCROLLING);
      setPhaseProgress(0);
      setPhaseDetail("Scrolling to reviews...");
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        if (autoFlowActiveRef.current && phaseRef.current === PHASES.SCROLLING) {
          const messageText = "Capture did not start. Try again or reload the page.";
          setError(messageText);
          setAutoFlowStatus(messageText);
          setAutoFlowActive(false);
          setPhase(PHASES.ERROR);
          setPhaseProgress(0);
          setPhaseDetail(messageText);
          toast.error(messageText);
        }
      }, 30000);

      // Capture source URL/name snapshot before starting capture
      const source = await fetchProductName();
      setAnalysisSource({
        url: source?.pageUrl ?? pageUrl,
        productName: source?.productName ?? productName,
      });

      const pagination =
        pages > 1 || pages === Infinity
          ? {
              enabled: true,
              maxPages: pages === Infinity ? 9999 : pages,
              pauseEachPage: false,
              totalPagesKnown:
                pages === Infinity
                  ? detectedPages && detectedPages > 1
                    ? detectedPages
                    : null
                  : pages,
            }
          : undefined;

      chrome.runtime.sendMessage(
        { action: ACTION_TYPES.START_ANALYSIS, pagination },
        () => {
          if (chrome.runtime.lastError) {
            setAutoFlowStatus("Failed to start capture.");
            setAutoFlowActive(false);
            toast.error("Failed to start capture");
          }
        }
      );
    },
    [toast, selectedPages, fetchProductName, pageUrl, productName]
  );

  const continueCapture = useCallback(() => {
    setPagePaused(false);
    setAutoFlowStatus("Continuing to next page...");
    chrome.runtime.sendMessage(
      { action: ACTION_TYPES.CONTINUE_PAGINATION },
      () => {
        if (chrome.runtime.lastError) {
          setAutoFlowStatus("Failed to continue capture.");
        }
      }
    );
  }, [capturedPageCount, selectedPages, detectedPages, toast]);

  const pauseAfterPage = useCallback(() => {
    setAutoFlowStatus("Will pause after this page...");
    chrome.runtime.sendMessage(
      { action: ACTION_TYPES.PAUSE_AFTER_PAGE },
      () => {
        if (chrome.runtime.lastError) {
          setAutoFlowStatus("Failed to pause capture.");
        }
      }
    );
  }, []);

  const analyzeNow = useCallback(() => {
    setPagePaused(false);
    setAutoFlowStatus("Finishing current page before analyzing...");
    chrome.runtime.sendMessage(
      { action: ACTION_TYPES.ANALYZE_NOW },
      () => {
        if (chrome.runtime.lastError) {
          setAutoFlowStatus("Failed to trigger analysis.");
        }
      }
    );
  }, []);

  const analyzePausedOcr = useCallback(() => {
    if (!pausedOcrText) return;
    const textToAnalyze = pausedOcrText;
    setPausedOcrText("");
    setAutoFlowStatus("Analyzing paused OCR...");
    analyzeText(textToAnalyze);
  }, [pausedOcrText, analyzeText]);

  const resumeOcr = useCallback(() => {
    if (!pausedOcrRemainingScreenshots.length) return;
    const prefixText = pausedOcrText;
    const totalScreenshots = pausedOcrTotalScreenshots || pausedOcrRemainingScreenshots.length;
    const completedScreenshots = pausedOcrCompletedScreenshots || 0;
    setPausedOcrText("");
    setPausedOcrRemainingScreenshots([]);
    setPausedOcrTotalScreenshots(0);
    setPausedOcrCompletedScreenshots(0);
    setAutoFlowActive(true);
    setAutoFlowStatus("Resuming OCR...");
    setPhase(PHASES.OCR);
    setPhaseProgress(Math.min(Math.max(Math.round((completedScreenshots / totalScreenshots) * 100), 2), 100));
    setPhaseDetail("Resuming OCR...");
    runOcrFlow(pausedOcrRemainingScreenshots, {
      prefixText,
      totalScreenshots,
      completedScreenshots,
    });
  }, [
    pausedOcrRemainingScreenshots,
    pausedOcrText,
    pausedOcrTotalScreenshots,
    pausedOcrCompletedScreenshots,
    runOcrFlow,
  ]);

  const pauseOcr = useCallback(() => {
    if (!ocr.loading) return;
    ocrPauseRequestedRef.current = true;
    ocr.stopAfterCurrent();
    setAutoFlowStatus("Pausing OCR after current image...");
    setPhaseDetail("Pausing OCR");
  }, [ocr]);

  const terminateOcr = useCallback(() => {
    if (!ocr.loading) return;
    ocrPauseRequestedRef.current = false;
    ocrTerminatedRef.current = true;
    setPausedOcrText("");
    setPausedOcrRemainingScreenshots([]);
    setPausedOcrTotalScreenshots(0);
    setPausedOcrCompletedScreenshots(0);
    setAutoFlowStatus("OCR terminated.");
    setAutoFlowActive(false);
    setPhase(PHASES.IDLE);
    setPhaseProgress(0);
    setPhaseDetail("OCR terminated");
    ocr.terminateNow();
  }, [ocr]);

  const stopAndAnalyze = useCallback(() => {
    if (ocr.loading) {
      setAutoFlowStatus("Stopping OCR after current image...");
      setPhaseDetail("Stopping after current image");
      ocrPauseRequestedRef.current = false;
      ocr.stopAfterCurrent();
      return;
    }

    if (autoFlowActive) {
      analyzeNow();
    }
  }, [ocr, autoFlowActive, analyzeNow]);

  const stopCapture = useCallback(() => {
    cancelRef.current = true;
    ocrPauseRequestedRef.current = false;
    setPausedOcrText("");
    setPausedOcrRemainingScreenshots([]);
    setPausedOcrTotalScreenshots(0);
    setPausedOcrCompletedScreenshots(0);
    ocrTerminatedRef.current = false;
    ocr.cancel();

    chrome.runtime.sendMessage({ action: ACTION_TYPES.STOP_ANALYSIS }, () => {
      if (chrome.runtime.lastError) {
        setAutoFlowStatus("Failed to stop capture.");
      } else {
        setAutoFlowStatus("Stopping...");
      }
    });
  }, [ocr]);

  const terminateCapture = useCallback(() => {
    cancelRef.current = true;
    ocrPauseRequestedRef.current = false;
    ocrTerminatedRef.current = false;
    setPausedOcrText("");
    setPausedOcrRemainingScreenshots([]);
    setPausedOcrTotalScreenshots(0);
    setPausedOcrCompletedScreenshots(0);
    setAutoFlowActive(false);
    setAutoFlowStatus("Capture terminated.");
    setAutoFlowProgress(0);
    setAutoFlowTotal(0);
    setPhase(PHASES.IDLE);
    setPhaseProgress(0);
    setPhaseDetail("Capture terminated");
    setPagePaused(false);
    ocr.cancel();

    chrome.runtime.sendMessage({ action: ACTION_TYPES.STOP_ANALYSIS }, () => {
      if (chrome.runtime.lastError) {
        setAutoFlowStatus("Failed to stop capture.");
      }
    });
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
    detectedPages,
    selectedPages,
    setSelectedPages,
    captureMetadata,
    productName,
    pageUrl,
    analysisSource,
    currentTabUrl,
    currentPlatform,
    isSupportedPage,
    isOnSupportedDomain: currentTabUrl === null ? true : isSupportedDomain(currentTabUrl),
    phase,
    phaseProgress,
    phaseDetail,
    pagePaused,
    capturedPageCount,
    capturedScreenshotCount,
    pageScreenshotCounts,
    pagesCaptured,
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
    pausedOcrText,
    setPausedOcrText,
    pausedOcrRemainingScreenshots,
    setPausedOcrRemainingScreenshots,
    pausedOcrTotalScreenshots,
    pausedOcrCompletedScreenshots,
  };
}
