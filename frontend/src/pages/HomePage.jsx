import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { useHistoryContext } from "@/contexts/HistoryContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhaseProgress } from "@/components/ui/phase-progress";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const isExtension =
  typeof chrome !== "undefined" && !!chrome?.runtime?.id;

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const FullscreenLoader = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95">
    <svg
      className="h-10 w-10 animate-spin text-primary"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <div className="text-center">
      <p className="text-sm font-medium">Preparing analysis results...</p>
      <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
    </div>
  </div>
);

const PLATFORMS = [
  {
    id: "shopee",
    name: "Shopee",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
    borderActive: "border-orange-500",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "lazada",
    name: "Lazada",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderActive: "border-blue-500",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  },
  {
    id: "amazon",
    name: "Amazon",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderActive: "border-yellow-500",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    name: "TikTok Shop",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/10",
    borderActive: "border-pink-500",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
        <circle cx="17" cy="7" r="5" />
      </svg>
    ),
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const {
    results,
    loading,
    error,
    autoFlowActive,
    autoFlowStatus,
    progressPercent,
    detectedPages,
    selectedPages,
    setSelectedPages,
    detectPages,
    startCapture,
    pagePaused,
    capturedPageCount,
    capturedScreenshotCount,
    continueCapture,
    analyzeNow,
    pauseAfterPage,
    pauseOcr,
    analyzePausedOcr,
    resumeOcr,
    stopAndAnalyze,
    terminateOcr,
    terminateCapture,
    phase,
    phaseProgress,
    phaseDetail,
    captureMetadata,
    productName,
    pageUrl,
    analysisSource,
    fetchProductName,
    resultsSaved,
    setResultsSaved,
    ocrLoading,
    pagesCaptured,
    pageScreenshotCounts,
    pausedOcrText,
    setPausedOcrText,
    pausedOcrRemainingScreenshots,
    setPausedOcrRemainingScreenshots,
    pausedOcrTotalScreenshots,
    pausedOcrCompletedScreenshots,
    stopCapture,
    isSupportedPage,
    isOnSupportedDomain,
    currentTabUrl,
    currentPlatform,
  } = useAnalysisContext();

  const { addEntry, getEntryByUrl } = useHistoryContext();

  const [showPageSelector, setShowPageSelector] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [captureAll, setCaptureAll] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showOcrStopDialog, setShowOcrStopDialog] = useState(false);
  const [ocrStopPending, setOcrStopPending] = useState(false);
  const [captureStopPending, setCaptureStopPending] = useState(false);
  const [showResultsLoader, setShowResultsLoader] = useState(false);
  const [showProductRequired, setShowProductRequired] = useState(false);
  const savedRef = useRef(false);
  const resultsTimerRef = useRef(null);

  // Navigate to results when analysis completes + save to history
  useEffect(() => {
    if (results && !loading && !autoFlowActive && !savedRef.current && !resultsSaved) {
      savedRef.current = true;
      addEntry({
        url: analysisSource?.url || pageUrl,
        productName: analysisSource?.productName || productName,
        results,
        captureMetadata,
      });
      setResultsSaved(true);
      setShowResultsLoader(true);
      if (!resultsTimerRef.current) {
        resultsTimerRef.current = setTimeout(() => {
          resultsTimerRef.current = null;
          navigate("/results");
        }, 800);
      }
    }
    if (!results) {
      savedRef.current = false;
      setShowResultsLoader(false);
      if (resultsTimerRef.current) {
        clearTimeout(resultsTimerRef.current);
        resultsTimerRef.current = null;
      }
    }
  }, [results, loading, autoFlowActive, navigate, addEntry, pageUrl, productName, captureMetadata, resultsSaved, setResultsSaved]);

  useEffect(() => {
    return () => {
      if (resultsTimerRef.current) {
        clearTimeout(resultsTimerRef.current);
        resultsTimerRef.current = null;
      }
    };
  }, []);

  // Reset local UI state when analysis context resets (e.g. tab change)
  useEffect(() => {
    if (detectedPages === null) {
      setShowPageSelector(false);
      setCaptureAll(false);
      setDetecting(false);
    }
  }, [detectedPages]);

  useEffect(() => {
    setShowProductRequired(false);
  }, [isSupportedPage, currentTabUrl]);

  useEffect(() => {
    if (!isSupportedPage) return;
    fetchProductName();
  }, [isSupportedPage, currentTabUrl, fetchProductName]);

  const isBusy = loading || autoFlowActive;

  const proceedWithCapture = async () => {
    setDetecting(true);
    try {
      const pages = await detectPages();
      if (pages > 1 || pages === -1) {
        setShowPageSelector(true);
      } else {
        startCapture(1);
      }
    } catch {
      startCapture(1);
    } finally {
      setDetecting(false);
    }
  };

  const handleCaptureClick = async () => {
    setDetecting(true);
    try {
      const { pageUrl: url, productName: name } = await fetchProductName();
      if (!url || !name) {
        setShowProductRequired(true);
        setDetecting(false);
        return;
      }
      const existing = getEntryByUrl(url);
      if (existing) {
        setDuplicateEntry(existing);
        setShowDuplicateDialog(true);
        setDetecting(false);
        return;
      }
    } catch {
      // ignore — proceed with capture
    }
    setDetecting(false);
    setShowProductRequired(false);
    proceedWithCapture();
  };

  const handleConfirmPages = () => {
    setShowPageSelector(false);
    startCapture(selectedPages);
  };

  const handleCancelPageSelect = () => {
    setShowPageSelector(false);
  };

  const handlePauseAfterPage = () => {
    setCaptureStopPending(true);
    setShowStopDialog(false);
    pauseAfterPage();
  };

  const handleStopAndAnalyze = () => {
    setCaptureStopPending(true);
    setShowStopDialog(false);
    stopAndAnalyze();
  };

  const handleTerminateCapture = () => {
    setCaptureStopPending(true);
    setShowStopDialog(false);
    terminateCapture();
  };

  const handleOcrPause = () => {
    setOcrStopPending(true);
    setShowOcrStopDialog(false);
    pauseOcr();
  };

  const handleOcrTerminate = () => {
    setOcrStopPending(true);
    setShowOcrStopDialog(false);
    terminateOcr();
  };

  const handleOcrStopAndAnalyze = () => {
    setOcrStopPending(true);
    setShowOcrStopDialog(false);
    stopAndAnalyze();
  };

  const handleAnalyzePausedOcr = () => {
    analyzePausedOcr();
  };

  const handleResumeOcr = () => {
    resumeOcr();
  };

  const handleDiscardPausedOcr = () => {
    setPausedOcrText("");
    setPausedOcrRemainingScreenshots([]);
  };

  useEffect(() => {
    if (!ocrLoading) {
      setOcrStopPending(false);
    }
  }, [ocrLoading]);

  useEffect(() => {
    if (!autoFlowActive) {
      setCaptureStopPending(false);
    }
  }, [autoFlowActive]);

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {showResultsLoader && <FullscreenLoader />}

      {/* Compact header */}
      <div className="flex items-center gap-3">
        <ShieldIcon />
        <div>
          <h1 className="text-lg font-semibold leading-tight">Review Analyzer</h1>
          <p className="text-xs text-muted-foreground">Detect fake reviews with ML</p>
        </div>
      </div>

      {/* Platform grid */}
      <div className="grid w-full max-w-lg grid-cols-2 gap-2">
        {PLATFORMS.map((platform) => {
          const isActive = currentPlatform === platform.id;
          return (
            <div
              key={platform.id}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                isActive
                  ? `${platform.borderActive} ${platform.bgColor}`
                  : "border-border bg-card"
              )}
            >
              <span className={cn("shrink-0", isActive ? platform.color : "text-muted-foreground")}>
                {platform.icon}
              </span>
              <span className={cn("text-sm font-medium", isActive ? platform.color : "text-foreground")}>
                {platform.name}
              </span>
              {isActive && (
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Action card */}
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          {isBusy && pagePaused ? (
            <div className="grid gap-4">
              <div className="text-center">
                <p className="text-sm font-medium">
                  Page {capturedPageCount} captured ({capturedScreenshotCount} screenshots)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Continue to next page or analyze what you have so far
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={continueCapture}
                >
                  Continue Capturing
                </Button>
                <Button
                  className="flex-1"
                  onClick={analyzeNow}
                >
                  Analyze Now
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStopDialog(true)}
                className="gap-2 text-muted-foreground"
              >
                <StopIcon />
                Stop
              </Button>
            </div>
          ) : isBusy ? (
            <div className="grid gap-4">
              <PhaseProgress
                phase={phase}
                phaseProgress={phaseProgress}
                phaseDetail={phaseDetail}
              />
              <Button
                variant="outline"
                onClick={() =>
                  ocrLoading ? setShowOcrStopDialog(true) : setShowStopDialog(true)
                }
                disabled={ocrLoading ? ocrStopPending : captureStopPending}
                className="gap-2"
              >
                <StopIcon />
                Stop
              </Button>
            </div>
          ) : showPageSelector ? (
            <div className="grid gap-4">
              {detectedPages === -1 ? (
                /* Unknown total pages — show number input + All Pages option */
                <>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Multiple review pages detected
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter how many pages to capture, or capture all
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pages to capture</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={selectedPages === Infinity ? "" : selectedPages}
                        placeholder="All"
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          setSelectedPages(Number.isFinite(val) && val > 0 ? val : 1);
                        }}
                        disabled={selectedPages === Infinity}
                        className="w-20 rounded border px-2 py-1 text-center text-sm tabular-nums disabled:opacity-50"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPages === Infinity}
                        onChange={(e) =>
                          setSelectedPages(e.target.checked ? Infinity : 5)
                        }
                        className="accent-primary"
                      />
                      <span>Capture all pages</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCancelPageSelect}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleConfirmPages}
                    >
                      <CameraIcon />
                      {selectedPages === Infinity
                        ? "Capture all pages"
                        : `Capture ${selectedPages} page${selectedPages !== 1 ? "s" : ""}`}
                    </Button>
                  </div>
                </>
              ) : (
                /* Known total pages — show slider */
                <>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {detectedPages} review page{detectedPages !== 1 ? "s" : ""} detected
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select how many pages to analyze
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pages to capture</span>
                      <input
                        type="number"
                        min={1}
                        max={detectedPages}
                        value={selectedPages === detectedPages && captureAll ? "" : selectedPages}
                        placeholder="All"
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          setCaptureAll(false);
                          setSelectedPages(
                            Number.isFinite(val) && val > 0
                              ? Math.min(val, detectedPages)
                              : 1
                          );
                        }}
                        disabled={captureAll}
                        className="w-20 rounded border px-2 py-1 text-center text-sm tabular-nums disabled:opacity-50"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={captureAll}
                        onChange={(e) => {
                          setCaptureAll(e.target.checked);
                          setSelectedPages(e.target.checked ? detectedPages : 5);
                        }}
                        className="accent-primary"
                      />
                      <span>Capture all {detectedPages} pages</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCancelPageSelect}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleConfirmPages}
                    >
                      <CameraIcon />
                      {captureAll
                        ? `Capture all ${detectedPages} pages`
                        : `Capture ${selectedPages} page${selectedPages !== 1 ? "s" : ""}`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : pausedOcrText ? (
            <div className="grid gap-3 text-center">
              <p className="text-sm font-medium">OCR paused</p>
              <p className="text-xs text-muted-foreground">
                Paused at image {Math.min(pausedOcrCompletedScreenshots, pausedOcrTotalScreenshots) || 0}
                {pausedOcrTotalScreenshots
                  ? ` of ${pausedOcrTotalScreenshots}`
                  : ""}. Resume OCR, analyze the extracted text, or discard it.
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={handleResumeOcr}
                  disabled={!pausedOcrRemainingScreenshots.length}
                >
                  Resume OCR
                </Button>
                <Button className="flex-1" onClick={handleAnalyzePausedOcr}>
                  Analyze Now
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscardPausedOcr}
                className="text-muted-foreground"
              >
                Discard
              </Button>
            </div>
          ) : isExtension ? (
            isSupportedPage ? (
              productName && pageUrl ? (
                <div className="grid gap-4">
                  <Button
                    onClick={handleCaptureClick}
                    size="lg"
                    className="gap-2 text-base"
                    disabled={detecting}
                  >
                    <CameraIcon />
                    {detecting ? "Detecting pages..." : "Capture & Analyze Reviews"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Make sure you're on a product page with visible reviews
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 text-center">
                  <p className="text-sm font-medium">Select a product first</p>
                  <p className="text-xs text-muted-foreground">
                    Open a product page with visible reviews to enable capture.
                  </p>
                </div>
              )
            ) : isOnSupportedDomain ? (
              <div className="grid gap-3 text-center">
                <p className="text-sm font-medium">Navigate to a product page</p>
                <p className="text-xs text-muted-foreground">
                  Open a specific product with reviews to capture and analyze.
                  The homepage and category pages are not supported.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 text-center">
                <p className="text-sm font-medium">Page not supported</p>
                <p className="text-xs text-muted-foreground">
                  Navigate to a product page on a supported platform to capture and
                  analyze reviews.
                </p>
                <p className="text-xs text-muted-foreground">
                  Shopee &middot; Lazada &middot; Amazon &middot; TikTok Shop
                </p>
              </div>
            )
          ) : (
            <div className="grid gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Install the Chrome extension to capture and analyze
                reviews directly from product pages.
              </p>
              <p className="text-xs text-muted-foreground">
                The extension automatically screenshots reviews, extracts
                text via OCR, and runs analysis through 6 ML models.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/5 px-4 py-3">
              <p className="text-center text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate detection dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogHeader>
          <DialogTitle>Page Already Analyzed</DialogTitle>
          <DialogDescription>
            {duplicateEntry?.productName && (
              <span className="font-medium">{duplicateEntry.productName}</span>
            )}
            {duplicateEntry?.productName && " was "}
            {!duplicateEntry?.productName && "This page was "}
            analyzed on{" "}
            {duplicateEntry?.date &&
              new Date(duplicateEntry.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDuplicateDialog(false);
              proceedWithCapture();
            }}
          >
            Analyze Again
          </Button>
          <Button
            onClick={() => {
              setShowDuplicateDialog(false);
              navigate(`/results?historyId=${duplicateEntry?.id}`);
            }}
          >
            View Previous Results
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Stop/pause dialog (capture) */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogHeader>
          <DialogTitle>Stop Capture?</DialogTitle>
          <DialogDescription>
            You can pause after this page, or stop now and analyze what has already been captured.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handlePauseAfterPage}
            disabled={pagePaused}
          >
            Pause After This Page
          </Button>
          <Button variant="destructive" onClick={handleTerminateCapture}>
            Terminate
          </Button>
          <Button onClick={handleStopAndAnalyze}>
            Stop & Analyze
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Stop/pause dialog (OCR) */}
      <Dialog open={showOcrStopDialog} onOpenChange={setShowOcrStopDialog}>
        <DialogHeader>
          <DialogTitle>Stop OCR?</DialogTitle>
          <DialogDescription>
            Pause, terminate, or stop and analyze what's done so far.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleOcrPause}
            disabled={ocrStopPending}
          >
            Pause OCR
          </Button>
          <Button
            variant="destructive"
            onClick={handleOcrTerminate}
            disabled={ocrStopPending}
          >
            Terminate
          </Button>
          <Button
            onClick={handleOcrStopAndAnalyze}
            disabled={ocrStopPending}
          >
            Stop & Analyze
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
