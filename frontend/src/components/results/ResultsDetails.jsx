import { FraudModelRow, SentimentModelRow } from "./ModelRow";
import { AverageCard } from "./AverageCard";
import { DataOverview } from "./DataOverview";
import { ProcessedTextPanel } from "./ProcessedTextPanel";

function SectionHeading({ children }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </h3>
  );
}

export function ResultsDetails({ results, captureMetadata, ocrText, ocrTextTruncated, ocrTextFullLength }) {
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

      {/* Two-column grid for fraud + sentiment */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Fraud Detection ── */}
        <div className="space-y-4">
          <SectionHeading>Fraud Detection</SectionHeading>
          <AverageCard
            title="Fraud Detection Consensus"
            description="Averaged across 3 models"
            result={fraud}
            type="fraud"
          />
          <div className="space-y-2">
            <FraudModelRow model={fraud?.models?.api} modelKey="api" modelName="HuggingFace API" />
            <FraudModelRow model={fraud?.models?.local_1} modelKey="local_1" modelName="RoBERTa" />
            <FraudModelRow model={fraud?.models?.local_2} modelKey="local_2" modelName="Random Forest" />
          </div>
        </div>

        {/* ── Sentiment Analysis ── */}
        <div className="space-y-4">
          <SectionHeading>Sentiment Analysis</SectionHeading>
          <AverageCard
            title="Sentiment Consensus"
            description="Averaged across 3 models"
            result={sentiment}
            type="sentiment"
          />
          <div className="space-y-2">
            <SentimentModelRow model={sentiment?.models?.api} modelKey="api" modelName="HuggingFace API" />
            <SentimentModelRow model={sentiment?.models?.local_1} modelKey="local_1" modelName="RoBERTa" />
            <SentimentModelRow model={sentiment?.models?.local_2} modelKey="local_2" modelName="SVM" />
          </div>
        </div>
      </div>

      <ProcessedTextPanel
        ocrText={ocrText}
        ocrTextTruncated={ocrTextTruncated}
        ocrTextFullLength={ocrTextFullLength}
      />
    </div>
  );
}
