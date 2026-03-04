import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FRAUD_MODEL_IDS,
  SENTIMENT_MODEL_IDS,
  MODEL_NAMES,
  MODEL_SOURCES,
} from "@/lib/constants";

function ModelToggle({ modelId, disabled, isLastEnabled, onToggle }) {
  const name = MODEL_NAMES[modelId] || modelId;
  const source = MODEL_SOURCES[modelId];

  return (
    <label
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors"
    >
      <input
        type="checkbox"
        checked={!disabled}
        disabled={isLastEnabled && !disabled}
        onChange={() => onToggle(modelId)}
        className="accent-primary h-3.5 w-3.5"
      />
      <span className={disabled ? "text-muted-foreground" : "text-foreground"}>
        {name}
      </span>
      <Badge
        variant="outline"
        className="ml-auto text-[9px] px-1.5 py-0"
      >
        {source === "api" ? "API" : "Local"}
      </Badge>
    </label>
  );
}

export function ModelConfig({ disabledModels, toggleModel }) {
  const disabledSet = new Set(disabledModels);
  const enabledFraudCount = FRAUD_MODEL_IDS.filter((id) => !disabledSet.has(id)).length;
  const enabledSentimentCount = SENTIMENT_MODEL_IDS.filter((id) => !disabledSet.has(id)).length;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Fraud Detection ({enabledFraudCount}/{FRAUD_MODEL_IDS.length})
          </p>
          <div className="space-y-0.5">
            {FRAUD_MODEL_IDS.map((id) => (
              <ModelToggle
                key={id}
                modelId={id}
                disabled={disabledSet.has(id)}
                isLastEnabled={enabledFraudCount <= 1}
                onToggle={toggleModel}
              />
            ))}
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Sentiment Analysis ({enabledSentimentCount}/{SENTIMENT_MODEL_IDS.length})
          </p>
          <div className="space-y-0.5">
            {SENTIMENT_MODEL_IDS.map((id) => (
              <ModelToggle
                key={id}
                modelId={id}
                disabled={disabledSet.has(id)}
                isLastEnabled={enabledSentimentCount <= 1}
                onToggle={toggleModel}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
