import { SentimentCard } from "./SentimentCard";
import { AuthenticityCard } from "./AuthenticityCard";
import { AverageCard } from "./AverageCard";
import { SkeletonCard } from "@/components/ui/skeleton";

function SectionHeading({ children }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </h3>
  );
}

export function ResultsPanel({ results, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Loading results">
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!results) return null;

  const { fraud, sentiment } = results;

  return (
    <div
      className="animate-in space-y-6"
      role="region"
      aria-label="Analysis results"
      aria-live="polite"
    >
      {/* Fraud Detection Section */}
      <div className="space-y-4">
        <SectionHeading>Fraud Detection</SectionHeading>
        <AverageCard
          title="Fraud Detection Average"
          description="Consensus across 3 models"
          result={fraud}
          type="fraud"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AuthenticityCard
            authenticity={fraud?.models?.api}
            modelName="HuggingFace API"
          />
          <AuthenticityCard
            authenticity={fraud?.models?.local_1}
            modelName="Logistic Regression"
          />
          <AuthenticityCard
            authenticity={fraud?.models?.local_2}
            modelName="Random Forest"
          />
        </div>
      </div>

      {/* Sentiment Analysis Section */}
      <div className="space-y-4">
        <SectionHeading>Sentiment Analysis</SectionHeading>
        <AverageCard
          title="Sentiment Analysis Average"
          description="Consensus across 3 models"
          result={sentiment}
          type="sentiment"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SentimentCard
            title="HuggingFace API"
            description="Hosted transformer model"
            sentiment={sentiment?.models?.api?.sentiment}
            confidence={sentiment?.models?.api?.confidence}
            status={sentiment?.models?.api?.status}
            error={sentiment?.models?.api?.error}
          />
          <SentimentCard
            title="Logistic Regression"
            description="Local trained model"
            sentiment={sentiment?.models?.local_1?.sentiment}
            confidence={sentiment?.models?.local_1?.confidence}
            status={sentiment?.models?.local_1?.status}
            error={sentiment?.models?.local_1?.error}
          />
          <SentimentCard
            title="SVM"
            description="Local SVM model"
            sentiment={sentiment?.models?.local_2?.sentiment}
            confidence={sentiment?.models?.local_2?.confidence}
            status={sentiment?.models?.local_2?.status}
            error={sentiment?.models?.local_2?.error}
          />
        </div>
      </div>
    </div>
  );
}
