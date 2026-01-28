import { cn } from "@/lib/utils";
import { CONFIDENCE_THRESHOLDS } from "@/lib/constants";

export function ConfidenceBar({ value, label, showValue = true, className }) {
  const percentage = Math.round((value || 0) * 100);

  const getVariant = () => {
    if (value >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
    if (value >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
    return "low";
  };

  const variant = getVariant();

  const variantStyles = {
    high: "bg-emerald-500",
    medium: "bg-amber-500",
    low: "bg-red-500",
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
          {showValue && (
            <span className="font-medium tabular-nums">{percentage}%</span>
          )}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]"
        role="meter"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${percentage}%` : `Confidence: ${percentage}%`}
      >
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ConfidenceComparison({ modelConfidence, heuristicConfidence }) {
  const modelPercent = Math.round((modelConfidence || 0) * 100);
  const heuristicPercent = Math.round((heuristicConfidence || 0) * 100);
  const total = modelPercent + heuristicPercent;
  const modelWeight = total > 0 ? Math.round((modelPercent / total) * 100) : 50;
  const heuristicWeight = 100 - modelWeight;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
        <span>Model ({modelPercent}%)</span>
        <span>Heuristic ({heuristicPercent}%)</span>
      </div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`Model contribution: ${modelWeight}%, Heuristic contribution: ${heuristicWeight}%`}
      >
        <div
          className="bg-blue-500 transition-all duration-500"
          style={{ width: `${modelWeight}%` }}
        />
        <div
          className="bg-purple-500 transition-all duration-500"
          style={{ width: `${heuristicWeight}%` }}
        />
      </div>
      <div className="flex items-center gap-4 text-[10px] text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          ML Model
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          Heuristics
        </span>
      </div>
    </div>
  );
}
