import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
    startCapture,
    stopCapture,
  } = useAnalysisContext();

  // Navigate to results when analysis completes
  useEffect(() => {
    if (results && !loading && !autoFlowActive) {
      navigate("/results");
    }
  }, [results, loading, autoFlowActive, navigate]);

  const isBusy = loading || autoFlowActive;

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
          {isBusy ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {autoFlowActive ? "Capturing reviews..." : "Analyzing..."}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {progressPercent}%
                  </span>
                </div>
                <Progress value={progressPercent} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {autoFlowStatus || "Processing..."}
              </p>
              <Button
                variant="outline"
                onClick={stopCapture}
                className="gap-2"
              >
                <StopIcon />
                Cancel
              </Button>
            </div>
          ) : isExtension ? (
            <div className="grid gap-4">
              <Button
                onClick={startCapture}
                size="lg"
                className="gap-2 text-base"
              >
                <CameraIcon />
                Capture & Analyze Reviews
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
    </div>
  );
}
