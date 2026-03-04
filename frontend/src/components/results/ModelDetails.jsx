import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ThresholdDisplay({ confidence, threshold }) {
  if (confidence == null || threshold == null) return null;
  const pct = Math.round(confidence * 100);
  const threshPct = Math.round(threshold * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Confidence vs Threshold</span>
        <span className="tabular-nums">
          {pct}% / {threshPct}%
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-primary/80 transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-red-500"
          style={{ left: `${threshPct}%` }}
          title={`Threshold: ${threshPct}%`}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        Red line = decision threshold ({threshPct}%)
      </p>
    </div>
  );
}

function HeuristicBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const entries = Object.entries(breakdown);
  if (!entries.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Heuristic Breakdown
      </p>
      {entries.map(([key, data]) => {
        const pct = Math.round((data.value || 0) * 100);
        const weightPct = Math.round((data.weight || 0) * 100);
        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {key.replace(/_/g, " ")}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {pct}%{" "}
                <span className="text-[10px]">(w: {weightPct}%, raw: {data.raw})</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-amber-500/70 transition-all"
                style={{ width: `${pct}%` }}
              />
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
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Top Contributing Features
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-1 pr-3 font-medium">Word</th>
              <th className="pb-1 pr-3 font-medium tabular-nums">TF-IDF</th>
              <th className="pb-1 pr-3 font-medium tabular-nums">
                {features[0]?.coefficient != null ? "Coeff" : "Importance"}
              </th>
              <th className="pb-1 font-medium tabular-nums">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1 pr-3 font-mono">{f.word}</td>
                <td className="py-1 pr-3 tabular-nums">{f.tfidf_score}</td>
                <td className="py-1 pr-3 tabular-nums">
                  {f.coefficient ?? f.importance}
                </td>
                <td className="py-1 tabular-nums">{f.contribution}</td>
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
  const allKeys = Object.entries(matches).filter(
    ([, v]) => Array.isArray(v) && v.length > 0
  );
  if (!allKeys.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Keyword Matches
      </p>
      {allKeys.map(([key, words]) => (
        <div key={key} className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">
            {key.replace(/_/g, " ")}:
          </span>
          {words.map((w, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
              {w}
            </Badge>
          ))}
        </div>
      ))}
      {matches.exclamation_count != null && (
        <p className="text-[10px] text-muted-foreground">
          Exclamation marks: {matches.exclamation_count}
        </p>
      )}
    </div>
  );
}

function ClassProbabilities({ probabilities }) {
  if (!probabilities) return null;
  const entries = Object.entries(probabilities);
  if (!entries.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Class Probabilities
      </p>
      {entries.map(([label, score]) => {
        const pct = Math.round(score * 100);
        const colorClass =
          label === "positive"
            ? "bg-green-500/70"
            : label === "negative"
              ? "bg-red-500/70"
              : "bg-slate-400/70";
        return (
          <div key={label} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="capitalize text-muted-foreground">{label}</span>
              <span className="tabular-nums text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-all ${colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ModelDetails({ model, type }) {
  const [expanded, setExpanded] = useState(false);

  if (!model || model.status === "error") return null;

  const hasDetails =
    model.heuristic_breakdown ||
    model.top_features?.length ||
    model.keyword_matches ||
    model.class_probabilities ||
    model.raw_model_scores ||
    model.raw_scores ||
    model.raw_api_scores ||
    model.decision_threshold != null;

  if (!hasDetails) return null;

  return (
    <Card className="border-dashed border-slate-200 dark:border-slate-800">
      <CardContent className="p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{model.model_name} — Details</span>
          <span className="text-[10px]">{expanded ? "Collapse" : "Expand"}</span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-4">
            <ThresholdDisplay
              confidence={model.confidence}
              threshold={model.decision_threshold}
            />

            {model.heuristic_breakdown && (
              <HeuristicBreakdown breakdown={model.heuristic_breakdown} />
            )}

            {model.top_features?.length > 0 && (
              <TopFeatures features={model.top_features} />
            )}

            {model.keyword_matches && (
              <KeywordMatches matches={model.keyword_matches} />
            )}

            {model.class_probabilities && (
              <ClassProbabilities probabilities={model.class_probabilities} />
            )}

            {model.raw_model_scores && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Raw Model Scores
                </p>
                <div className="flex gap-2">
                  {Object.entries(model.raw_model_scores).map(([label, score]) => (
                    <Badge key={label} variant="outline" className="text-[10px] tabular-nums">
                      {label}: {(score * 100).toFixed(1)}%
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {model.raw_scores && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Raw API Scores
                </p>
                <div className="flex gap-2">
                  {Object.entries(model.raw_scores).map(([label, score]) => (
                    <Badge key={label} variant="outline" className="text-[10px] tabular-nums">
                      {label}: {(score * 100).toFixed(1)}%
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {model.raw_api_scores && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Raw API Scores
                </p>
                <div className="flex gap-2">
                  {Object.entries(model.raw_api_scores).map(([label, score]) => (
                    <Badge key={label} variant="outline" className="text-[10px] tabular-nums">
                      {label}: {(score * 100).toFixed(1)}%
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
