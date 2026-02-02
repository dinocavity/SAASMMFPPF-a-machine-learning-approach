import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBar, ConfidenceComparison } from "./ConfidenceBar";
import { MODEL_DESCRIPTIONS, SIGNAL_EXPLANATIONS } from "@/lib/constants";

/* ── tiny icons ─────────────────────────────────────── */

const ChevronDown = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SignalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ── sub-components for expanded details ────────────── */

function ThresholdDisplay({ confidence, threshold }) {
  if (confidence == null || threshold == null) return null;
  const pct = Math.round(confidence * 100);
  const threshPct = Math.round(threshold * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Confidence vs Threshold</span>
        <span className="tabular-nums">{pct}% / {threshPct}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full rounded-full bg-primary/80 transition-all" style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-red-500" style={{ left: `${threshPct}%` }} title={`Threshold: ${threshPct}%`} />
      </div>
      <p className="text-[10px] text-muted-foreground/70">Red line = decision threshold ({threshPct}%)</p>
    </div>
  );
}

function HeuristicBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const entries = Object.entries(breakdown);
  if (!entries.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Heuristic Breakdown</p>
      {entries.map(([key, data]) => {
        const pct = Math.round((data.value || 0) * 100);
        const weightPct = Math.round((data.weight || 0) * 100);
        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
              <span className="tabular-nums text-muted-foreground">
                {pct}% <span className="text-[10px]">(w:{weightPct}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-amber-500/70 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopFeatures({ features }) {
  if (!features?.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Top Features</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-1 pr-2 font-medium">Word</th>
              <th className="pb-1 pr-2 font-medium tabular-nums">TF-IDF</th>
              <th className="pb-1 pr-2 font-medium tabular-nums">{features[0]?.coefficient != null ? "Coeff" : "Imp."}</th>
              <th className="pb-1 font-medium tabular-nums">Contrib.</th>
            </tr>
          </thead>
          <tbody>
            {features.slice(0, 8).map((f, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-0.5 pr-2 font-mono">{f.word}</td>
                <td className="py-0.5 pr-2 tabular-nums">{f.tfidf_score}</td>
                <td className="py-0.5 pr-2 tabular-nums">{f.coefficient ?? f.importance}</td>
                <td className="py-0.5 tabular-nums">{f.contribution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KeywordMatches({ matches }) {
  if (!matches) return null;
  const allKeys = Object.entries(matches).filter(([, v]) => Array.isArray(v) && v.length > 0);
  if (!allKeys.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Keyword Matches</p>
      {allKeys.map(([key, words]) => (
        <div key={key} className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">{key.replace(/_/g, " ")}:</span>
          {words.map((w, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{w}</Badge>
          ))}
        </div>
      ))}
    </div>
  );
}

function ClassProbabilities({ probabilities }) {
  if (!probabilities) return null;
  const entries = Object.entries(probabilities);
  if (!entries.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Class Probabilities</p>
      {entries.map(([label, score]) => {
        const pct = Math.round(score * 100);
        const colorClass = label === "positive" ? "bg-green-500/70" : label === "negative" ? "bg-red-500/70" : "bg-slate-400/70";
        return (
          <div key={label} className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="capitalize text-muted-foreground">{label}</span>
              <span className="tabular-nums text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RawScores({ scores, label }) {
  if (!scores) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(scores).map(([l, s]) => (
          <Badge key={l} variant="outline" className="text-[10px] tabular-nums">{l}: {(s * 100).toFixed(1)}%</Badge>
        ))}
      </div>
    </div>
  );
}

/* ── info tooltip ───────────────────────────────────── */

function InfoTooltip({ modelKey, type }) {
  const descKey = `${modelKey}_${type}`;
  const desc = MODEL_DESCRIPTIONS[descKey];
  if (!desc) return null;

  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground">
        <InfoIcon />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border bg-popover p-3 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <span className="font-semibold">How this model works</span>
        <br />
        {desc}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
      </span>
    </span>
  );
}

/* ── main component ─────────────────────────────────── */

export function FraudModelRow({ model, modelKey, modelName }) {
  const [expanded, setExpanded] = useState(false);

  if (!model) return null;

  const isError = model.status === "error";

  if (isError) {
    return (
      <div className="rounded-lg border border-dashed border-red-300 p-3 dark:border-red-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{modelName}</span>
          <Badge variant="outline" className="text-red-600 border-red-300 text-[10px] dark:text-red-400 dark:border-red-700">Error</Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{model.error || "Model failed to produce a result."}</p>
      </div>
    );
  }

  const { is_fake, confidence, model_confidence, heuristic_confidence, signals = [] } = model;
  const showBreakdown = model_confidence !== undefined || heuristic_confidence !== undefined;
  const hasDetails = model.heuristic_breakdown || model.top_features?.length || model.keyword_matches || model.class_probabilities || model.raw_model_scores || model.raw_scores || model.raw_api_scores || model.decision_threshold != null;

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      {/* ── compact header row ── */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* verdict dot */}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${is_fake ? "bg-red-500" : "bg-emerald-500"}`} />

        {/* name + info */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{modelName}</span>
          <InfoTooltip modelKey={modelKey} type="fraud" />
        </div>

        {/* badge */}
        <Badge variant={is_fake ? "destructive" : "success"} className="ml-auto shrink-0 text-[10px] px-2 py-0.5">
          {is_fake ? "Fake" : "Authentic"}
        </Badge>

        {/* confidence number */}
        <span className="shrink-0 text-xs tabular-nums font-medium w-10 text-right">
          {Math.round((confidence || 0) * 100)}%
        </span>

        {/* expand chevron */}
        {hasDetails && (
          <ChevronDown className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* ── inline confidence bar (always visible) ── */}
      <div className="px-3 pb-2 -mt-1">
        <ConfidenceBar value={confidence} className="[&>div:first-child]:hidden" />
      </div>

      {/* ── signals preview (always visible if present) ── */}
      {signals.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {signals.slice(0, 3).map((s) => (
            <span key={s} className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" title={SIGNAL_EXPLANATIONS[s] || s}>
              <SignalIcon /> {s.replace(/-/g, " ")}
            </span>
          ))}
          {signals.length > 3 && <span className="text-[10px] text-muted-foreground self-center">+{signals.length - 3} more</span>}
        </div>
      )}

      {/* ── expanded details ── */}
      {expanded && (
        <div className="space-y-3 border-t bg-muted/30 p-3">
          {showBreakdown && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground">Confidence Breakdown</p>
              <ConfidenceComparison modelConfidence={model_confidence} heuristicConfidence={heuristic_confidence} />
            </div>
          )}

          <ThresholdDisplay confidence={model.confidence} threshold={model.decision_threshold} />
          {model.heuristic_breakdown && <HeuristicBreakdown breakdown={model.heuristic_breakdown} />}
          {model.top_features?.length > 0 && <TopFeatures features={model.top_features} />}
          {model.keyword_matches && <KeywordMatches matches={model.keyword_matches} />}

          <RawScores scores={model.raw_model_scores} label="Raw Model Scores" />
          <RawScores scores={model.raw_scores} label="Raw API Scores" />
          <RawScores scores={model.raw_api_scores} label="Raw API Scores" />

          {model.blend_weights && (
            <p className="text-[10px] text-muted-foreground/70">
              Blend: {Math.round(model.blend_weights.model * 100)}% model + {Math.round(model.blend_weights.heuristic * 100)}% heuristic
            </p>
          )}

          {model.is_fallback != null && (
            <Badge variant={model.is_fallback ? "secondary" : "outline"} className="text-[10px]">
              {model.is_fallback ? "Fallback mode" : "API mode"}
            </Badge>
          )}

          {/* full signals list */}
          {signals.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">All Signals</p>
              <ul className="space-y-1">
                {signals.map((signal, i) => (
                  <li key={i} className="flex items-start gap-1.5 rounded bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <SignalIcon />
                    <span>
                      <span className="font-medium capitalize">{signal.replace(/-/g, " ")}</span>
                      {SIGNAL_EXPLANATIONS[signal] && (
                        <span className="text-amber-700 dark:text-amber-300"> — {SIGNAL_EXPLANATIONS[signal]}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SentimentModelRow({ model, modelKey, modelName }) {
  const [expanded, setExpanded] = useState(false);

  if (!model) return null;

  const isError = model.status === "error";

  if (isError) {
    return (
      <div className="rounded-lg border border-dashed border-red-300 p-3 dark:border-red-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{modelName}</span>
          <Badge variant="outline" className="text-red-600 border-red-300 text-[10px] dark:text-red-400 dark:border-red-700">Error</Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{model.error || "Model failed to produce a result."}</p>
      </div>
    );
  }

  const { sentiment, confidence } = model;
  const hasDetails = model.class_probabilities || model.raw_model_scores || model.raw_scores || model.raw_api_scores;

  const variant = sentiment === "positive" ? "success" : sentiment === "negative" ? "destructive" : "secondary";

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      {/* ── compact header row ── */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* sentiment dot */}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sentiment === "positive" ? "bg-emerald-500" : sentiment === "negative" ? "bg-red-500" : "bg-slate-400"}`} />

        {/* name + info */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{modelName}</span>
          <InfoTooltip modelKey={modelKey} type="sentiment" />
        </div>

        {/* badge */}
        <Badge variant={variant} className="ml-auto shrink-0 capitalize text-[10px] px-2 py-0.5">
          {sentiment || "N/A"}
        </Badge>

        {/* confidence */}
        <span className="shrink-0 text-xs tabular-nums font-medium w-10 text-right">
          {Math.round((confidence || 0) * 100)}%
        </span>

        {/* expand chevron */}
        {hasDetails && (
          <ChevronDown className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* ── inline confidence bar ── */}
      <div className="px-3 pb-2 -mt-1">
        <ConfidenceBar value={confidence} className="[&>div:first-child]:hidden" />
      </div>

      {/* ── expanded details ── */}
      {expanded && (
        <div className="space-y-3 border-t bg-muted/30 p-3">
          {model.class_probabilities && <ClassProbabilities probabilities={model.class_probabilities} />}
          <RawScores scores={model.raw_model_scores} label="Raw Model Scores" />
          <RawScores scores={model.raw_scores} label="Raw API Scores" />
          <RawScores scores={model.raw_api_scores} label="Raw API Scores" />
        </div>
      )}
    </div>
  );
}
