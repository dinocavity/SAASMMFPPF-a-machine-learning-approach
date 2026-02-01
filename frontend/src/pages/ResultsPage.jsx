import { Link, useSearchParams } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { useHistoryContext } from "@/contexts/HistoryContext";
import { ResultsSummary } from "@/components/results/ResultsSummary";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";

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
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading results">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
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
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-foreground"
            title="How it works: We capture review text via OCR, run 6 ML models plus heuristic checks, then combine their confidence into a final consensus."
            aria-label="How the model works"
          >
            <InfoIcon />
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
