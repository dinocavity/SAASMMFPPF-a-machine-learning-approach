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

const isExtension =
  typeof chrome !== "undefined" && !!chrome?.runtime?.id;

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
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

const steps = [
  {
    num: "1",
    title: "Navigate",
    desc: "Go to any product page with reviews",
  },
  {
    num: "2",
    title: "Capture",
    desc: "Click the button below to screenshot reviews",
  },
  {
    num: "3",
    title: "Results",
    desc: "6 ML models analyze for fraud & sentiment",
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
    stopCapture,
  } = useAnalysisContext();

  const { addEntry, getEntryByUrl } = useHistoryContext();

  const [showPageSelector, setShowPageSelector] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showOcrStopDialog, setShowOcrStopDialog] = useState(false);
  const [ocrStopPending, setOcrStopPending] = useState(false);
  const savedRef = useRef(false);

  // Navigate to results when analysis completes + save to history
  useEffect(() => {
    if (results && !loading && !autoFlowActive && !savedRef.current && !resultsSaved) {
      savedRef.current = true;
      addEntry({
        url: pageUrl,
        productName,
        results,
        captureMetadata,
      });
      setResultsSaved(true);
      navigate("/results");
    }
    if (!results) {
      savedRef.current = false;
    }
  }, [results, loading, autoFlowActive, navigate, addEntry, pageUrl, productName, captureMetadata, resultsSaved, setResultsSaved]);

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
      const { pageUrl: url } = await fetchProductName();
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
    setShowStopDialog(false);
    pauseAfterPage();
  };

  const handleStopAndAnalyze = () => {
    setShowStopDialog(false);
    stopAndAnalyze();
  };

  const handleTerminateCapture = () => {
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

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Hero section */}
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldIcon />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            SAASMMFPPF
          </p>
          <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
            Review Authenticity Analyzer
          </h1>
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Detect fake or suspicious product reviews using machine learning
          and linguistic heuristics across 6 different models.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">ML + Heuristics</Badge>
          <Badge>6 Models</Badge>
        </div>
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
                disabled={ocrStopPending}
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
                      <span className="font-semibold tabular-nums">
                        {selectedPages} of {detectedPages}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={detectedPages}
                      value={selectedPages}
                      onChange={(e) => setSelectedPages(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>1</span>
                      <span>{detectedPages}</span>
                    </div>
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
                      Capture {selectedPages} page{selectedPages !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : pausedOcrText ? (
            <div className="grid gap-3 text-center">
              <p className="text-sm font-medium">OCR paused</p>
              <p className="text-xs text-muted-foreground">
                Resume OCR, analyze the extracted text, or discard it.
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

      {/* How it works */}
      <div className="grid w-full max-w-lg gap-4 sm:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.num} className="text-center">
            <CardContent className="p-4">
              <span className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {step.num}
              </span>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
            Choose whether to pause OCR, terminate the process, or stop and analyze what has been processed so far.
            <span className="mt-2 block text-xs text-muted-foreground">
              Pages captured: {pagesCaptured || capturedPageCount || 0}
              {detectedPages && detectedPages > 0
                ? ` / ${detectedPages}`
                : " / Unknown"}
              {selectedPages === Infinity
                ? " (capture all)"
                : ` (target ${selectedPages})`}
              {pageScreenshotCounts?.length
                ? ` • Screenshots per page: ${pageScreenshotCounts.join(", ")}`
                : ""}
            </span>
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
