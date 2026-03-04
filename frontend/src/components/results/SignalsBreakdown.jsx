import { SIGNAL_EXPLANATIONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { SignalIcon, CheckIcon } from "@/components/ui/icons";

export function SignalsBreakdown({ signals = [], isFake }) {
  if (!signals || signals.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
        <CheckIcon />
        <span className="text-sm">No suspicious signals detected</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={isFake ? "destructive" : "warning"}>
          {signals.length} signal{signals.length !== 1 ? "s" : ""} detected
        </Badge>
      </div>
      <ul className="space-y-2" role="list" aria-label="Detected fraud signals">
        {signals.map((signal, index) => (
          <li
            key={index}
            className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          >
            <SignalIcon />
            <div className="min-w-0">
              <p className="text-sm font-medium capitalize">
                {signal.replace(/-/g, " ")}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {SIGNAL_EXPLANATIONS[signal] || "Potential indicator of inauthentic content"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
