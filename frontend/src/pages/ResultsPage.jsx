import { Link, useSearchParams } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { useHistoryContext } from "@/contexts/HistoryContext";
import { ResultsSummary } from "@/components/results/ResultsSummary";
import { Button } from "@/components/ui/button";

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const EmptyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <div className="text-center">
      <p className="text-sm font-medium">Preparing analysis results...</p>
      <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
    </div>
  </div>
);

export function ResultsPage() {
  const { results: liveResults, loading, reset, captureMetadata: liveMeta, productName: liveName } = useAnalysisContext();
  const { getEntryById } = useHistoryContext();
  const [searchParams] = useSearchParams();

  const historyId = searchParams.get("historyId");
  const historyEntry = historyId ? getEntryById(historyId) : null;

  const isHistoryView = !!historyEntry;
  const results = isHistoryView ? historyEntry.results : liveResults;
  const captureMetadata = isHistoryView ? historyEntry.captureMetadata : liveMeta;
  const productName = isHistoryView ? historyEntry.productName : liveName;

  if (!isHistoryView && loading) {
    return <FullscreenLoader />;
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <EmptyIcon />
        <h2 className="font-heading text-xl font-semibold">No results yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Go to the home page and capture reviews from a product page to see
          fraud detection and sentiment analysis results here.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <ArrowLeftIcon />
            Go to Home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-xl font-semibold">Analysis Results</h2>
          <span className="group relative inline-flex">
            <span
              className="inline-flex h-7 w-7 cursor-help items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              aria-label="How the analysis works"
            >
              <InfoIcon />
            </span>
            <span className="pointer-events-none absolute top-full left-0 z-50 mt-2 w-72 rounded-lg border bg-popover p-3 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
              <span className="font-semibold">How it works</span><br />
              We capture review text via OCR, then run 6 ML models (3 fraud + 3 sentiment) combined with heuristic checks. Each model's confidence is averaged into a consensus verdict. Hover the <span className="font-mono text-[10px]">i</span> icon on each model for specifics.
            </span>
          </span>
        </div>
        {isHistoryView ? (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to="/history">
              <ArrowLeftIcon />
              Back to History
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link to="/" onClick={reset}>
              New Analysis
            </Link>
          </Button>
        )}
      </div>

      <ResultsSummary
        results={results}
        captureMetadata={captureMetadata}
        productName={productName}
        historyId={historyId}
      />
    </div>
  );
}
