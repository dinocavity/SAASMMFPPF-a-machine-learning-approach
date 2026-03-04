import { Card, CardContent } from "@/components/ui/card";

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 text-center dark:bg-slate-900">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

export function DataOverview({ captureMetadata, textMetadata }) {
  if (!captureMetadata && !textMetadata) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Data Overview
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {captureMetadata?.totalPages != null && (
            <StatCard
              label="Pages Captured"
              value={captureMetadata.totalPages}
            />
          )}
          {captureMetadata?.totalScreenshots != null && (
            <StatCard
              label="Screenshots"
              value={captureMetadata.totalScreenshots}
            />
          )}
          {(textMetadata?.char_count ?? captureMetadata?.ocrTextLength) != null && (
            <StatCard
              label="Characters"
              value={(textMetadata?.char_count ?? captureMetadata?.ocrTextLength).toLocaleString()}
            />
          )}
          {(textMetadata?.word_count ?? captureMetadata?.ocrWordCount) != null && (
            <StatCard
              label="Words"
              value={(textMetadata?.word_count ?? captureMetadata?.ocrWordCount).toLocaleString()}
            />
          )}
          {textMetadata?.sentence_count != null && (
            <StatCard
              label="Sentences"
              value={textMetadata.sentence_count}
            />
          )}
          {textMetadata?.avg_word_length != null && (
            <StatCard
              label="Avg Word Length"
              value={textMetadata.avg_word_length}
              sub="characters"
            />
          )}
          {textMetadata?.avg_sentence_length != null && (
            <StatCard
              label="Avg Sentence Length"
              value={textMetadata.avg_sentence_length}
              sub="words"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
