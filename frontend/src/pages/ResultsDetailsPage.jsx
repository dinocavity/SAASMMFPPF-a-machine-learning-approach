import { Link, useSearchParams } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { useHistoryContext } from "@/contexts/HistoryContext";
import { ResultsDetails } from "@/components/results/ResultsDetails";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";

export function ResultsDetailsPage() {
  const { results: liveResults, captureMetadata: liveMeta, ocrText: liveOcrText } = useAnalysisContext();
  const { getEntryById } = useHistoryContext();
  const [searchParams] = useSearchParams();

  const historyId = searchParams.get("historyId");
  const historyEntry = historyId ? getEntryById(historyId) : null;

  const isHistoryView = !!historyEntry;
  const results = isHistoryView ? historyEntry.results : liveResults;
  const captureMetadata = isHistoryView ? historyEntry.captureMetadata : liveMeta;
  const ocrText = isHistoryView ? historyEntry?.ocrText : liveOcrText;
  const ocrTextTruncated = isHistoryView ? historyEntry?.ocrTextTruncated ?? false : false;
  const ocrTextFullLength = isHistoryView ? historyEntry?.ocrTextFullLength ?? null : null;

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

      <ResultsDetails
        results={results}
        captureMetadata={captureMetadata}
        ocrText={ocrText}
        ocrTextTruncated={ocrTextTruncated}
        ocrTextFullLength={ocrTextFullLength}
      />
    </div>
  );
}
