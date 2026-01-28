import { SentimentCard } from "./SentimentCard";
import { AuthenticityCard } from "./AuthenticityCard";
import { SkeletonCard } from "@/components/ui/skeleton";

export function ResultsPanel({ results, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Loading results">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!results) return null;

  return (
    <div
      className="grid gap-4"
      role="region"
      aria-label="Analysis results"
      aria-live="polite"
    >
      <SentimentCard
        title="API Sentiment"
        description="Hosted transformer model"
        sentiment={results.sentiment_api?.sentiment}
        confidence={results.sentiment_api?.confidence}
      />

      <SentimentCard
        title="Custom Sentiment"
        description="Fine-tuned local model"
        sentiment={results.sentiment_custom?.sentiment}
        confidence={results.sentiment_custom?.confidence}
      />

      <AuthenticityCard authenticity={results.authenticity} />
    </div>
  );
}
