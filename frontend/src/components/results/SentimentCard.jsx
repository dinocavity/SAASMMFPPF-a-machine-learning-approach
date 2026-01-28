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

export function SentimentCard({ title, description, sentiment, confidence }) {
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
