import { Badge } from "@/components/ui/badge";

const ShieldIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export function Header() {
  return (
    <header className="relative overflow-hidden rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:bg-slate-900/80">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      <div className="relative flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldIcon />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
                SAASMMFPPF
              </p>
              <h1 className="font-heading text-xl font-semibold leading-tight sm:text-2xl">
                Review Authenticity Analyzer
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">ML + Heuristics</Badge>
            <Badge>6 Models</Badge>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Detect fake or suspicious product reviews using machine learning and linguistic
          heuristics. Paste review text below or capture reviews from a product page.
        </p>
      </div>
    </header>
  );
}
