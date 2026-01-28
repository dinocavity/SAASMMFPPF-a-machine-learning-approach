import { SIGNAL_EXPLANATIONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

const SignalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

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
