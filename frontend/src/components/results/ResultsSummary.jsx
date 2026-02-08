import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceBar } from "./ConfidenceBar";
import { FraudModelRow, SentimentModelRow } from "./ModelRow";
import { ArrowRightIcon } from "@/components/ui/icons";

/* ── consensus header (compact) ─────────────────────── */

function ConsensusHeader({ label, badge, badgeVariant, confidence, modelsOk, modelsTotal }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">{label}</p>
        <Badge variant={badgeVariant} className="text-[10px] px-2 py-0.5 shrink-0">{badge}</Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {confidence != null && (
          <span className="text-xs tabular-nums font-medium">{Math.round(confidence * 100)}%</span>
        )}
        <span className="text-[10px] text-muted-foreground">{modelsOk}/{modelsTotal} models</span>
      </div>
    </div>
  );
}

/* ── capture stats bar ──────────────────────────────── */

function CaptureStats({ captureMetadata, textMetadata }) {
  const stats = [];
  if (captureMetadata?.totalPages != null) stats.push(`${captureMetadata.totalPages} page${captureMetadata.totalPages !== 1 ? "s" : ""}`);
  if (captureMetadata?.totalScreenshots != null) stats.push(`${captureMetadata.totalScreenshots} screenshots`);
  const wordCount = textMetadata?.word_count ?? captureMetadata?.ocrWordCount;
  if (wordCount != null) stats.push(`${wordCount.toLocaleString()} words`);
  const sentenceCount = textMetadata?.sentence_count;
  if (sentenceCount != null) stats.push(`${sentenceCount} sentences`);
  if (!stats.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {stats.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-border">·</span>}
          {s}
        </span>
      ))}
    </div>
  );
}

/* ── main component ─────────────────────────────────── */

export function ResultsSummary({ results, captureMetadata, productName, historyId }) {
  if (!results) return null;

  const { fraud, sentiment, text_metadata } = results;

  const fraudConfidence = fraud?.average_confidence;
  const fraudConsensus = fraud?.consensus_is_fake;
  const fraudModelsOk = fraud?.models_ok ?? 0;
  const fraudModelsTotal = fraud?.models_total ?? 3;
  const fraudAllFailed = fraudModelsOk === 0;

  const sentConfidence = sentiment?.average_confidence;
  const sentConsensus = sentiment?.consensus_sentiment;
  const sentModelsOk = sentiment?.models_ok ?? 0;
  const sentModelsTotal = sentiment?.models_total ?? 3;
  const sentAllFailed = sentModelsOk === 0;

  const fraudBadgeVariant = fraudAllFailed ? "secondary" : fraudConsensus ? "destructive" : "success";
  const fraudBadgeLabel = fraudAllFailed ? "N/A" : fraudConsensus ? "Likely Fake" : "Authentic";

  const sentBadgeVariant = sentAllFailed ? "secondary" : sentConsensus === "positive" ? "success" : sentConsensus === "negative" ? "destructive" : "secondary";
  const sentBadgeLabel = sentAllFailed ? "N/A" : sentConsensus || "N/A";

  return (
    <div className="space-y-4" role="region" aria-label="Analysis results dashboard">
      {/* product name + stats */}
      {(productName || captureMetadata || text_metadata) && (
        <div className="space-y-1 text-center">
          {productName && <p className="text-sm font-semibold leading-tight line-clamp-2">{productName}</p>}
          <CaptureStats captureMetadata={captureMetadata} textMetadata={text_metadata} />
        </div>
      )}

      {/* ── two-column grid: fraud | sentiment ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── fraud column ── */}
        <Card className={`border-2 ${fraudAllFailed ? "border-slate-300 dark:border-slate-700" : fraudConsensus ? "border-red-200 dark:border-red-900" : "border-emerald-200 dark:border-emerald-900"}`}>
          <CardContent className="p-4 space-y-3">
            <ConsensusHeader
              label="Fraud Detection"
              badge={fraudBadgeLabel}
              badgeVariant={fraudBadgeVariant}
              confidence={fraudConfidence}
              modelsOk={fraudModelsOk}
              modelsTotal={fraudModelsTotal}
            />
            {fraudConfidence != null && <ConfidenceBar value={fraudConfidence} label="Avg. Confidence" />}

            {/* model rows */}
            <div className="space-y-2 pt-1">
              <FraudModelRow model={fraud?.models?.api} modelKey="api" modelName="HuggingFace API" />
              <FraudModelRow model={fraud?.models?.local_1} modelKey="local_1" modelName="RoBERTa" />
              <FraudModelRow model={fraud?.models?.local_2} modelKey="local_2" modelName="Random Forest" />
            </div>
          </CardContent>
        </Card>

        {/* ── sentiment column ── */}
        <Card className="border-2 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 space-y-3">
            <ConsensusHeader
              label="Sentiment"
              badge={sentBadgeLabel}
              badgeVariant={sentBadgeVariant}
              confidence={sentConfidence}
              modelsOk={sentModelsOk}
              modelsTotal={sentModelsTotal}
            />
            {sentConfidence != null && <ConfidenceBar value={sentConfidence} label="Avg. Confidence" />}

            {/* model rows */}
            <div className="space-y-2 pt-1">
              <SentimentModelRow model={sentiment?.models?.api} modelKey="api" modelName="HuggingFace API" />
              <SentimentModelRow model={sentiment?.models?.local_1} modelKey="local_1" modelName="RoBERTa" />
              <SentimentModelRow model={sentiment?.models?.local_2} modelKey="local_2" modelName="SVM" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── link to full details page ── */}
      <Button asChild variant="outline" size="sm" className="w-full gap-2">
        <Link to={historyId ? `/results/details?historyId=${historyId}` : "/results/details"}>
          Full Data Overview & Breakdown
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}
