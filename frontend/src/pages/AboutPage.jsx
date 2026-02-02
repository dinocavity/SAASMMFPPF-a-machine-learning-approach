import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLATFORMS = ["Shopee", "Lazada", "Amazon", "TikTok Shop"];

const PIPELINE_STEPS = [
  {
    title: "On-page capture",
    detail:
      "The extension detects the review section, scrolls through it, and captures multiple viewport screenshots per page (up to 8 per page) so reviews are preserved exactly as displayed.",
  },
  {
    title: "OCR extraction",
    detail:
      "Tesseract.js runs locally in the UI to extract review text from each screenshot. The extracted text blocks are merged into a single analysis payload.",
  },
  {
    title: "Model analysis",
    detail:
      "Six ML models run in parallel (3 fraud + 3 sentiment). Each model returns a confidence score and a label. If a model fails, it is skipped in the aggregate.",
  },
  {
    title: "Consensus",
    detail:
      "Fraud is decided by majority vote across successful fraud models and an average confidence. Sentiment uses the most common label plus average confidence across the three sentiment models.",
  },
];

const FRAUD_MODELS = [
  {
    name: "HuggingFace API (RoBERTa SST-2)",
    tags: ["API", "RoBERTa"],
    summary: "Cloud model for fast fraud scoring with a local fallback.",
    description:
      "Calls the HuggingFace inference API (textattack/roberta-base-SST-2). Uses the positive label score as fraud confidence and flags fake when confidence > 0.7. If the API is unavailable, a fallback heuristic scores keyword hits, exclamation density, and short length.",
  },
  {
    name: "RoBERTa + Heuristics (Local)",
    tags: ["Local", "Heuristics"],
    summary: "Local RoBERTa score blended with review-pattern heuristics.",
    description:
      "Runs a local RoBERTa SST-2 pipeline and treats the negative label score as fraud probability. Blends that with a heuristic score (exclamations, caps ratio, repeated characters, short review, promo phrases). Combined score = 0.7 * model + 0.3 * heuristics; fake if > 0.6.",
  },
  {
    name: "Random Forest (TF-IDF)",
    tags: ["Local", "TF-IDF"],
    summary: "TF-IDF signals scored by a Random Forest classifier.",
    description:
      "Uses TF-IDF bigrams (max 5,000 features) and a Random Forest classifier. Uses predict_proba for fraud confidence and flags fake when confidence > 0.6. Reports the most influential TF-IDF features per input.",
  },
];

const SENTIMENT_MODELS = [
  {
    name: "HuggingFace API (DistilBERT SST-2)",
    tags: ["API", "DistilBERT"],
    summary: "Cloud sentiment model with keyword fallback.",
    description:
      "Calls the HuggingFace inference API (distilbert-base-uncased-finetuned-sst-2-english). Chooses the highest scoring label. If the API is unavailable, a keyword-based fallback returns positive/negative/neutral.",
  },
  {
    name: "RoBERTa Twitter Sentiment",
    tags: ["Local", "RoBERTa"],
    summary: "Local multi-class sentiment with confidence breakdowns.",
    description:
      "Runs cardiffnlp/twitter-roberta-base-sentiment-latest locally. Returns positive, neutral, or negative with class probabilities. The highest score becomes the sentiment label.",
  },
  {
    name: "SVM (TF-IDF)",
    tags: ["Local", "TF-IDF"],
    summary: "Calibrated SVM with interpretable TF-IDF signals.",
    description:
      "Uses TF-IDF n-grams with a calibrated Linear SVM. Predicts positive/negative with probabilities and returns the top contributing features based on TF-IDF weight and model coefficients.",
  },
];

function SectionHeader({ title, description }) {
  return (
    <div className="space-y-1">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function ModelCard({ name, tags, summary, description }) {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <details className="group/model space-y-3">
          <summary className="flex cursor-pointer list-none flex-col gap-2 rounded-md">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{name}</h3>
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{summary}</p>
            <span className="text-[10px] text-primary/70">
              <span className="group-open/model:hidden">Expand details</span>
              <span className="hidden group-open/model:inline">Hide details</span>
            </span>
          </summary>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </details>
      </CardContent>
    </Card>
  );
}

export function AboutPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          SAASMMFPPF-a-machine-learning-approach
        </p>
        <h1 className="font-heading text-2xl font-semibold">
          SENTIMENT ANALYSIS AND SOCIAL MEDIA MONITORING FOR PREVENTING PURCHASE FRAUD: A MACHINE LEARNING APPROACH.
        </h1>
        <p className="text-sm text-muted-foreground">
          Review Analyzer captures on-page product reviews, extracts text locally
          with OCR, and runs multiple fraud and sentiment models to deliver a clear,
          explainable verdict for shoppers and analysts.
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <Badge key={platform} variant="secondary" className="text-[10px]">
              {platform}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground">
            Quick overview
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              Capture visible reviews, run OCR locally, score six ML models, then combine
              their outputs into fraud + sentiment results.
            </p>
          </div>

          <details className="group rounded-lg border bg-background p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
              <span>How we get the data</span>
              <span className="text-xs font-normal text-primary/70">
                <span className="group-open:hidden">Expand details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </span>
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              All review text comes directly from the product page you are viewing.
            </p>
            <div className="mt-3 grid gap-3 text-xs text-muted-foreground">
              {PIPELINE_STEPS.map((step) => (
                <div key={step.title} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
          </details>

          <details className="group rounded-lg border bg-background p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
              <span>Fraud detection models</span>
              <span className="text-xs font-normal text-primary/70">
                <span className="group-open:hidden">Expand models</span>
                <span className="hidden group-open:inline">Hide models</span>
              </span>
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              These three models focus on authenticity signals and review spam patterns.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {FRAUD_MODELS.map((model) => (
                <ModelCard key={model.name} {...model} />
              ))}
            </div>
          </details>

          <details className="group rounded-lg border bg-background p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
              <span>Sentiment models</span>
              <span className="text-xs font-normal text-primary/70">
                <span className="group-open:hidden">Expand models</span>
                <span className="hidden group-open:inline">Hide models</span>
              </span>
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              These three models estimate review tone (positive/neutral/negative).
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {SENTIMENT_MODELS.map((model) => (
                <ModelCard key={model.name} {...model} />
              ))}
            </div>
          </details>

          <details className="group rounded-lg border bg-background p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
              <span>How results are combined</span>
              <span className="text-xs font-normal text-primary/70">
                <span className="group-open:hidden">Expand details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </span>
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              We aggregate only successful model outputs to keep the UI robust.
            </p>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Fraud:</span> majority vote
                across the three fraud models, plus an averaged confidence score.
              </p>
              <p>
                <span className="font-medium text-foreground">Sentiment:</span> most common
                label across the three sentiment models, plus an averaged confidence score.
              </p>
            </div>
          </details>

          <details className="group rounded-lg border bg-background p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
              <span>Limitations</span>
              <span className="text-xs font-normal text-primary/70">
                <span className="group-open:hidden">Expand details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </span>
            </summary>
            <ul className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <li>Screenshot quality affects OCR accuracy.</li>
              <li>Authenticity detection is probabilistic.</li>
              <li>Limited training data impacts performance.</li>
              <li>Results are platform-agnostic.</li>
              <li>OCR struggles with stylized fonts, glare, and low contrast.</li>
              <li>API sentiment requires connectivity and may throttle or time out.</li>
              <li>Heuristic linguistic signals can misfire on short or slang-heavy reviews.</li>
              <li>Models are tuned for English and may degrade on mixed languages.</li>
              <li>Evaluation metrics only reflect the quality of labeled samples provided.</li>
            </ul>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
