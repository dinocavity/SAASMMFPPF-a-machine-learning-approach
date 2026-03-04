import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfidenceBar, ConfidenceComparison } from "./ConfidenceBar";
import { SignalsBreakdown } from "./SignalsBreakdown";

export function AuthenticityCard({ authenticity, modelName }) {
  if (!authenticity) return null;

  const {
    is_fake,
    confidence,
    model_confidence,
    heuristic_confidence,
    signals = [],
    model_name,
    status,
    error,
  } = authenticity;

  const displayName = modelName || model_name || "Authenticity Check";
  const isError = status === "error";

  if (isError) {
    return (
      <Card className="border-dashed border-red-300 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{displayName}</CardTitle>
          <CardDescription>Model unavailable</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-red-600 border-red-300 dark:text-red-400 dark:border-red-700">
            Error
          </Badge>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            {error || "This model failed to produce a result."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const showBreakdown = model_confidence !== undefined || heuristic_confidence !== undefined;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{displayName}</CardTitle>
        <CardDescription>
          {showBreakdown
            ? "Combined ML model and heuristic analysis"
            : `Fraud detection via ${model_name || "model"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={is_fake ? "destructive" : "success"}>
            {is_fake ? "Likely Fake" : "Likely Authentic"}
          </Badge>
        </div>

        <ConfidenceBar
          value={confidence}
          label="Overall Confidence"
        />

        {showBreakdown && (
          <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-900">
            <p className="mb-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">
              Confidence Breakdown
            </p>
            <ConfidenceComparison
              modelConfidence={model_confidence}
              heuristicConfidence={heuristic_confidence}
            />
          </div>
        )}

        {signals.length > 0 || showBreakdown ? (
          <div>
            <p className="mb-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">
              Detected Signals
            </p>
            <SignalsBreakdown signals={signals} isFake={is_fake} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
