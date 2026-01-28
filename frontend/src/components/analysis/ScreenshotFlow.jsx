import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalysisProgress } from "./AnalysisProgress";

export function ScreenshotFlow({
  onStart,
  onStop,
  active,
  status,
  elapsed,
  ocrLoading,
  ocrProgress,
  captureProgress,
  captureTotal,
  ocrError,
}) {
  return (
    <Card className="border-none bg-white/80 shadow-lg dark:bg-slate-800/80">
      <CardHeader>
        <CardTitle>Review Analysis</CardTitle>
        <CardDescription>
          Capture and analyze product reviews for authenticity.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-3 rounded-xl border bg-white p-4 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Screenshot OCR</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Captures reviews from the page and extracts text automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onStart}
                disabled={active}
                loading={active && !ocrLoading}
              >
                {active ? "Capturing..." : "Analyze Reviews"}
              </Button>
              {active && (
                <Button onClick={onStop} variant="destructive">
                  Stop
                </Button>
              )}
            </div>
          </div>

          {active && (
            <AnalysisProgress
              status={status}
              progress={ocrLoading ? ocrProgress : 0}
              elapsed={elapsed}
              ocrLoading={ocrLoading}
              ocrProgress={ocrProgress}
              captureProgress={captureProgress}
              captureTotal={captureTotal}
            />
          )}

          {ocrError && (
            <p className="text-xs text-red-600" role="alert">
              {ocrError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
