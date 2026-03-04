import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfidenceBar } from "./ConfidenceBar";

export function AverageCard({ title, description, result, type }) {
  if (!result) return null;

  const isFraud = type === "fraud";
  const confidence = result.average_confidence;
  const consensus = isFraud ? result.consensus_is_fake : result.consensus_sentiment;
  const modelsOk = result.models_ok ?? 0;
  const modelsTotal = result.models_total ?? 3;
  const allFailed = modelsOk === 0;

  const getBadgeVariant = () => {
    if (allFailed) return "secondary";
    if (isFraud) {
      return consensus ? "destructive" : "success";
    }
    if (consensus === "positive") return "success";
    if (consensus === "negative") return "destructive";
    return "secondary";
  };

  const getBadgeLabel = () => {
    if (allFailed) return "No models available";
    if (isFraud) {
      return consensus ? "Consensus: Likely Fake" : "Consensus: Likely Authentic";
    }
    return `Consensus: ${consensus || "N/A"}`;
  };

  const hasPartialFailure = modelsOk < modelsTotal && modelsOk > 0;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={getBadgeVariant()} className="capitalize">
            {getBadgeLabel()}
          </Badge>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {modelsOk}/{modelsTotal} models
          </span>
        </div>
        {hasPartialFailure && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {modelsTotal - modelsOk} model{modelsTotal - modelsOk > 1 ? "s" : ""} failed — average based on {modelsOk} result{modelsOk > 1 ? "s" : ""}
          </p>
        )}
        {allFailed && (
          <p className="text-xs text-red-600 dark:text-red-400">
            All models failed to produce results.
          </p>
        )}
        {confidence !== undefined && confidence !== null && (
          <ConfidenceBar
            value={confidence}
            label="Average Confidence"
          />
        )}
      </CardContent>
    </Card>
  );
}
