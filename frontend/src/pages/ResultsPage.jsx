import { Link, useSearchParams } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { useHistoryContext } from "@/contexts/HistoryContext";
import { ResultsSummary } from "@/components/results/ResultsSummary";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  EmptyResultsIcon as EmptyIcon,
  InfoIcon,
  SpinnerIcon,
} from "@/components/ui/icons";

const FullscreenLoader = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95">
    <SpinnerIcon size={40} className="text-primary" />
    <div className="text-center">
      <p className="text-sm font-medium">Preparing analysis results...</p>
      <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
    </div>
  </div>
);

export function ResultsPage() {
  const { results: liveResults, loading, reset, captureMetadata: liveMeta, productName: liveName, analysisSource } = useAnalysisContext();
  const { getEntryById } = useHistoryContext();
  const [searchParams] = useSearchParams();

  const historyId = searchParams.get("historyId");
  const historyEntry = historyId ? getEntryById(historyId) : null;

  const isHistoryView = !!historyEntry;
  const results = isHistoryView ? historyEntry.results : liveResults;
  const captureMetadata = isHistoryView ? historyEntry.captureMetadata : liveMeta;
  const productName = isHistoryView
    ? historyEntry.productName
    : (analysisSource?.productName || liveName);

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
