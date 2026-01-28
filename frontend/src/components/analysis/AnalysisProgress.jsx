import { Progress } from "@/components/ui/progress";

export function AnalysisProgress({
  status,
  progress,
  elapsed,
  ocrLoading,
  ocrProgress,
  captureProgress,
  captureTotal,
}) {
  const progressValue = ocrLoading
    ? ocrProgress
    : captureTotal
      ? Math.round((captureProgress / captureTotal) * 100)
      : 0;

  const statusText = ocrLoading
    ? `OCR progress: ${ocrProgress}%`
    : captureTotal
      ? `Capture progress: ${captureProgress}/${captureTotal}`
      : "Capture pending...";

  return (
    <div className="grid gap-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
        <span>{status}</span>
        <span>{elapsed}s</span>
      </div>
      <Progress value={progressValue} variant="warning" />
      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
        {statusText}
      </p>
    </div>
  );
}
