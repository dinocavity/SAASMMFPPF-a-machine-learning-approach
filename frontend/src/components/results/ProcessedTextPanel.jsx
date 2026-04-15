import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const PREVIEW_LINES = 60;
const PREVIEW_CHARS = 2000; // fallback for plain-text (history) view

export function ProcessedTextPanel({ ocrText, annotatedOcrLines, ocrTextTruncated, ocrTextFullLength }) {
  const [expanded, setExpanded] = useState(false);

  if (!ocrText && !annotatedOcrLines?.length) return null;

  // ── Annotated view (live results) ──────────────────────────────────────────
  if (annotatedOcrLines?.length) {
    const keptCount = annotatedOcrLines.filter(l => l.kept && l.text).length;
    const filteredCount = annotatedOcrLines.filter(l => !l.kept && l.text).length;
    const displayLines = expanded ? annotatedOcrLines : annotatedOcrLines.slice(0, PREVIEW_LINES);
    const hasMore = annotatedOcrLines.length > PREVIEW_LINES;

    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Processed Text Proof
            </p>
            <span className="text-[10px] text-muted-foreground">
              <span className="text-green-600 dark:text-green-400 font-medium">{keptCount} lines used</span>
              <span className="mx-1 opacity-40">·</span>
              <span className="opacity-50">{filteredCount} filtered out</span>
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/60" />
              Contributed to analysis
            </span>
            <span className="flex items-center gap-1.5 opacity-50">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted-foreground/30" />
              Filtered out (noise / OCR artifact)
            </span>
          </div>

          {/* Lines */}
          <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/40 p-3 space-y-px">
            {displayLines.map((line, i) => {
              // Empty line — just a spacer, render a small gap
              if (!line.text) {
                return <div key={i} className="h-2" />;
              }
              if (line.kept) {
                return (
                  <div
                    key={i}
                    className="px-1.5 py-px rounded bg-green-500/10 text-foreground/90 font-mono text-[11px] leading-relaxed"
                  >
                    {line.text}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="px-1.5 py-px text-muted-foreground/40 line-through font-mono text-[10px] leading-relaxed select-none"
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline"
            >
              {expanded
                ? "Show less"
                : `Show more (${annotatedOcrLines.length - PREVIEW_LINES} more lines)`}
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Plain-text fallback (history view — annotated lines not stored) ─────────
  const displayText = expanded ? ocrText : ocrText.slice(0, PREVIEW_CHARS);
  const hasMore = ocrText.length > PREVIEW_CHARS;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Processed Text Proof
          </p>
          {ocrTextTruncated && (
            <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
              Showing first 5,000 of {ocrTextFullLength?.toLocaleString()} chars (storage limit)
            </span>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/40 p-3">
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/80">
            {displayText}
          </pre>
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline"
          >
            {expanded
              ? "Show less"
              : `Show more (${(ocrText.length - PREVIEW_CHARS).toLocaleString()} more chars)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
