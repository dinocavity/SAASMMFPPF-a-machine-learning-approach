import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceBar } from "./ConfidenceBar";
import { SIGNAL_EXPLANATIONS } from "@/lib/constants";

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const SignalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function FraudVerdictCard({ fraud }) {
  if (!fraud) return null;

  const confidence = fraud.average_confidence;
  const consensus = fraud.consensus_is_fake;
  const modelsOk = fraud.models_ok ?? 0;
  const allFailed = modelsOk === 0;

  // Collect all signals from successful models
  const signals = [];
  if (fraud.models) {
    Object.values(fraud.models).forEach((m) => {
      if (m?.status === "ok" && m.signals?.length) {
        m.signals.forEach((s) => {
          if (!signals.includes(s)) signals.push(s);
        });
      }
    });
  }

  const getBadgeVariant = () => {
    if (allFailed) return "secondary";
    return consensus ? "destructive" : "success";
  };

  const getBadgeLabel = () => {
    if (allFailed) return "No models available";
    return consensus ? "Likely Fake" : "Likely Authentic";
  };

  const borderColor = allFailed
    ? "border-slate-300 dark:border-slate-700"
    : consensus
      ? "border-red-300 dark:border-red-800"
      : "border-emerald-300 dark:border-emerald-800";

  const bgColor = allFailed
    ? ""
    : consensus
      ? "bg-red-50/50 dark:bg-red-950/20"
      : "bg-emerald-50/50 dark:bg-emerald-950/20";

  return (
    <Card className={`border-2 ${borderColor} ${bgColor}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Fraud Detection
          </p>
          <span className="text-[10px] text-muted-foreground">
            {modelsOk}/{fraud.models_total ?? 3} models
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={getBadgeVariant()} className="text-sm px-3 py-1">
            {getBadgeLabel()}
          </Badge>
        </div>

        {confidence != null && (
          <ConfidenceBar value={confidence} label="Average Confidence" />
        )}

        {signals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Detected Signals
            </p>
            <div className="flex flex-wrap gap-1.5">
              {signals.slice(0, 5).map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  title={SIGNAL_EXPLANATIONS[signal] || signal}
                >
                  <SignalIcon />
                  {signal.replace(/-/g, " ")}
                </span>
              ))}
              {signals.length > 5 && (
                <span className="text-[10px] text-muted-foreground">
                  +{signals.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SentimentVerdictCard({ sentiment }) {
  if (!sentiment) return null;

  const confidence = sentiment.average_confidence;
  const consensus = sentiment.consensus_sentiment;
  const modelsOk = sentiment.models_ok ?? 0;
  const allFailed = modelsOk === 0;

  const getBadgeVariant = () => {
    if (allFailed) return "secondary";
    if (consensus === "positive") return "success";
    if (consensus === "negative") return "destructive";
    return "secondary";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sentiment Analysis
          </p>
          <span className="text-[10px] text-muted-foreground">
            {modelsOk}/{sentiment.models_total ?? 3} models
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getBadgeVariant()} className="capitalize">
            {allFailed ? "No models available" : consensus || "N/A"}
          </Badge>
          {confidence != null && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CaptureStats({ captureMetadata, textMetadata }) {
  const stats = [];

  if (captureMetadata?.totalPages != null) {
    stats.push(`${captureMetadata.totalPages} page${captureMetadata.totalPages !== 1 ? "s" : ""}`);
  }
  if (captureMetadata?.totalScreenshots != null) {
    stats.push(`${captureMetadata.totalScreenshots} screenshots`);
  }
  const wordCount = textMetadata?.word_count ?? captureMetadata?.ocrWordCount;
  if (wordCount != null) {
    stats.push(`${wordCount.toLocaleString()} words`);
  }

  if (!stats.length) return null;

  return (
    <p className="text-center text-xs text-muted-foreground">
      {stats.join(" \u00b7 ")}
    </p>
  );
}

export function ResultsSummary({ results, captureMetadata, productName, historyId }) {
  if (!results) return null;

  const { fraud, sentiment, text_metadata } = results;

  return (
    <div className="space-y-3" role="region" aria-label="Analysis summary">
      {productName && (
        <div className="text-center">
          <p className="text-sm font-semibold leading-tight line-clamp-2">
            {productName}
          </p>
        </div>
      )}

      <FraudVerdictCard fraud={fraud} />
      <SentimentVerdictCard sentiment={sentiment} />

      <CaptureStats
        captureMetadata={captureMetadata}
        textMetadata={text_metadata}
      />

      <Button asChild variant="outline" className="w-full gap-2">
        <Link to={historyId ? `/results/details?historyId=${historyId}` : "/results/details"}>
          View Detailed Breakdown
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}
