import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const PREVIEW_CHARS = 2000;

export function ProcessedTextPanel({ ocrText, ocrTextTruncated, ocrTextFullLength }) {
  const [expanded, setExpanded] = useState(false);
  if (!ocrText) return null;

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
