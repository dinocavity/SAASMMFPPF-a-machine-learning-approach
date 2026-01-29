import { Link } from "react-router-dom";
import { useAnalysisContext } from "@/contexts/AnalysisContext";
import { ResultsPanel } from "@/components/results/ResultsPanel";
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

export function ResultsPage() {
  const { results, loading, reset } = useAnalysisContext();

  if (!results && !loading) {
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
        <h2 className="font-heading text-xl font-semibold">Analysis Results</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          asChild
        >
          <Link to="/" onClick={reset}>
            New Analysis
          </Link>
        </Button>
      </div>

      <ResultsPanel results={results} loading={loading} />
    </div>
  );
}
