import { PHASE_LABELS } from "@/lib/constants";
import { CheckIcon } from "@/components/ui/icons";

const PHASE_ORDER = ["scrolling", "capturing", "ocr", "analyzing", "complete"];

export function PhaseProgress({ phase, phaseProgress, phaseDetail }) {
  const activeIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div className="space-y-3">
      {/* Step circles */}
      <div className="flex items-center justify-between gap-1">
        {PHASE_ORDER.map((p, i) => {
          const isComplete = activeIndex > i || phase === "complete";
          const isActive = activeIndex === i && phase !== "complete";
          const isFuture = activeIndex < i && phase !== "complete";

          return (
            <div key={p} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                {/* Connector line before */}
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isComplete || isActive
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                )}

                {/* Circle */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? <CheckIcon strokeWidth={3} /> : i + 1}
                </div>

                {/* Connector line after */}
                {i < PHASE_ORDER.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isComplete ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium ${
                  isComplete || isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {PHASE_LABELS[p]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar for active step */}
      {activeIndex >= 0 && phase !== "complete" && phase !== "error" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          {phase === "analyzing" ? (
            <div className="h-full w-full animate-pulse rounded-full bg-primary/60" />
          ) : phase === "scrolling" ? (
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
          ) : (
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.max(phaseProgress, 2)}%` }}
            />
          )}
        </div>
      )}

      {/* Detail text */}
      {phaseDetail && (
        <p className="text-center text-xs text-muted-foreground">
          {phaseDetail}
        </p>
      )}
    </div>
  );
}
