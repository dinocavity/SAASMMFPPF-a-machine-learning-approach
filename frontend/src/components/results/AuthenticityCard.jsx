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

export function AuthenticityCard({ authenticity }) {
  if (!authenticity) return null;

  const {
    is_fake,
    confidence,
    model_confidence,
    heuristic_confidence,
    signals = [],
  } = authenticity;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Authenticity Check</CardTitle>
        <CardDescription>
          Combined ML model and heuristic analysis
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

        {(model_confidence !== undefined || heuristic_confidence !== undefined) && (
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

        <div>
          <p className="mb-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">
            Detected Signals
          </p>
          <SignalsBreakdown signals={signals} isFake={is_fake} />
        </div>
      </CardContent>
    </Card>
  );
}
