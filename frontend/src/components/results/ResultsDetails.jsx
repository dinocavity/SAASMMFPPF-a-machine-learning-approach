import { SentimentCard } from "./SentimentCard";
import { AuthenticityCard } from "./AuthenticityCard";
import { AverageCard } from "./AverageCard";
import { DataOverview } from "./DataOverview";
import { ModelDetails } from "./ModelDetails";

function SectionHeading({ children }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </h3>
  );
}

export function ResultsDetails({ results, captureMetadata }) {
  if (!results) return null;

  const { fraud, sentiment, text_metadata } = results;

  return (
    <div
      className="animate-in space-y-6"
      role="region"
      aria-label="Detailed analysis results"
      aria-live="polite"
    >
      {/* Data Overview */}
      <DataOverview
        captureMetadata={captureMetadata}
        textMetadata={text_metadata}
      />

      {/* Fraud Detection Section */}
      <div className="space-y-4">
        <SectionHeading>Fraud Detection</SectionHeading>
        <AverageCard
          title="Fraud Detection Average"
          description="Consensus across 3 models"
          result={fraud}
          type="fraud"
        />
        <div className="space-y-4">
          <AuthenticityCard
            authenticity={fraud?.models?.api}
            modelName="HuggingFace API"
          />
          <AuthenticityCard
            authenticity={fraud?.models?.local_1}
            modelName="RoBERTa"
          />
          <AuthenticityCard
            authenticity={fraud?.models?.local_2}
            modelName="Random Forest"
          />
        </div>
        <div className="space-y-2">
          <ModelDetails model={fraud?.models?.api} type="fraud" />
          <ModelDetails model={fraud?.models?.local_1} type="fraud" />
          <ModelDetails model={fraud?.models?.local_2} type="fraud" />
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
        <div className="space-y-4">
          <SentimentCard
            title="HuggingFace API"
            description="Hosted transformer model"
            sentiment={sentiment?.models?.api?.sentiment}
            confidence={sentiment?.models?.api?.confidence}
            status={sentiment?.models?.api?.status}
            error={sentiment?.models?.api?.error}
          />
          <SentimentCard
            title="RoBERTa"
            description="Local RoBERTa transformer"
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
        <div className="space-y-2">
          <ModelDetails model={sentiment?.models?.api} type="sentiment" />
          <ModelDetails model={sentiment?.models?.local_1} type="sentiment" />
          <ModelDetails model={sentiment?.models?.local_2} type="sentiment" />
        </div>
      </div>
    </div>
  );
}
