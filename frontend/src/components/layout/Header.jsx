import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="flex flex-col gap-3 rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
            SAASMMFPPF
          </p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            Review Authenticity Analyzer
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">ML + Heuristics</Badge>
          <Badge>Automated</Badge>
        </div>
      </div>
      <p className="max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">
        Automatically analyze product reviews for authenticity. Our system captures reviews via screenshot,
        extracts text with OCR, and uses machine learning combined with linguistic heuristics to detect
        fake or suspicious reviews—helping you make informed purchase decisions.
      </p>
    </header>
  );
}
