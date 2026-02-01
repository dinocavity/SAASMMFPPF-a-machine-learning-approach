import { Link, useSearchParams } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { useHistoryContext } from "@/contexts/HistoryContext";
import { ResultsDetails } from "@/components/results/ResultsDetails";
import { Button } from "@/components/ui/button";

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export function ResultsDetailsPage() {
  const { results: liveResults, captureMetadata: liveMeta } = useAnalysisContext();
  const { getEntryById } = useHistoryContext();
  const [searchParams] = useSearchParams();

  const historyId = searchParams.get("historyId");
  const historyEntry = historyId ? getEntryById(historyId) : null;

  const isHistoryView = !!historyEntry;
  const results = isHistoryView ? historyEntry.results : liveResults;
  const captureMetadata = isHistoryView ? historyEntry.captureMetadata : liveMeta;

  const backTo = isHistoryView
    ? `/results?historyId=${historyId}`
    : "/results";

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <h2 className="font-heading text-xl font-semibold">No results yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Run an analysis first to see detailed model breakdowns.
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
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to={backTo}>
          <ArrowLeftIcon />
          Back to Summary
        </Link>
      </Button>

      <ResultsDetails results={results} captureMetadata={captureMetadata} />
    </div>
  );
}
