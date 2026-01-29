import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfidenceBar } from "./ConfidenceBar";

const getSentimentVariant = (sentiment) => {
  if (!sentiment) return "secondary";
  if (sentiment === "positive") return "success";
  if (sentiment === "negative") return "destructive";
  return "secondary";
};

export function SentimentCard({ title, description, sentiment, confidence, status, error }) {
  const isError = status === "error";

  if (isError) {
    return (
      <Card className="border-dashed border-red-300 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
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

  const variant = getSentimentVariant(sentiment);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={variant} className="capitalize">
            {sentiment || "N/A"}
          </Badge>
        </div>
        {confidence !== undefined && confidence !== null && (
          <ConfidenceBar
            value={confidence}
            label="Confidence"
          />
        )}
      </CardContent>
    </Card>
  );
}
