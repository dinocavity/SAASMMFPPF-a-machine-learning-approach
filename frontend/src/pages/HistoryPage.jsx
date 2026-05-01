import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useHistoryContext } from "@/contexts/HistoryContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  EmptyHistoryIcon as EmptyIcon,
  SearchIcon,
  TrashIcon,
  ChevronDownIcon as ChevronIcon,
} from "@/components/ui/icons";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function groupHistory(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const urlKey = normalizeUrl(entry.url);
    const nameKey = entry.productName?.toLowerCase().trim() || "";
    const key = urlKey || nameKey || entry.id;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        urlKey,
        nameKey,
        entries: [],
      });
    }
    groups.get(key).entries.push(entry);
  });
  return Array.from(groups.values());
}

function getFraudBadgeVariant(verdict) {
  if (verdict === "Likely Fake") return "destructive";
  if (verdict === "Likely Authentic") return "success";
  return "secondary";
}

function getSentimentBadgeVariant(verdict) {
  if (verdict === "positive") return "success";
  if (verdict === "negative") return "destructive";
  return "secondary";
}

function getPlatformFromUrl(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('shopee')) return 'Shopee';
    if (hostname.includes('lazada')) return 'Lazada';
    if (hostname.includes('amazon')) return 'Amazon';
    if (hostname.includes('tiktok')) return 'TikTok';
    return null;
  } catch { return null; }
}

export function HistoryPage() {
  const { history, clearHistory } = useHistoryContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [fraudFilter, setFraudFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const filtered = useMemo(() => {
    let items = [...history];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (e) => e.productName?.toLowerCase().includes(q)
      );
    }

    // Fraud filter
    if (fraudFilter !== "all") {
      items = items.filter((e) => e.fraudVerdict === fraudFilter);
    }

    // Sentiment filter
    if (sentimentFilter !== "all") {
      items = items.filter((e) => e.sentimentVerdict === sentimentFilter);
    }

    // Sort
    items.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return items;
  }, [history, search, fraudFilter, sentimentFilter, sortOrder]);

  const grouped = useMemo(() => {
    const groups = groupHistory(filtered);
    groups.forEach((group) => {
      group.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
      group.latest = group.entries[0];
    });
    return groups;
  }, [filtered]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleClear = () => {
    clearHistory();
    setShowClearDialog(false);
  };

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <EmptyIcon />
        <h2 className="font-heading text-xl font-semibold">No history yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Analysis results will appear here after you capture and analyze
          reviews from product pages.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-semibold">Analysis History</h2>

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <SearchIcon className="text-muted-foreground" />
        </div>
        <input
          type="text"
          placeholder="Search by product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={fraudFilter}
          onChange={(e) => setFraudFilter(e.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
        >
          <option value="all">Fraud: All</option>
          <option value="Likely Fake">Likely Fake</option>
          <option value="Likely Authentic">Likely Authentic</option>
        </select>

        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
        >
          <option value="all">Sentiment: All</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* History list */}
      {grouped.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No results match your filters
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((group) => {
            const entry = group.latest;
            const isExpanded = expandedGroups.has(group.key);
            const hasMultiple = group.entries.length > 1;
            const detailsHref = `/results?historyId=${entry.id}`;
            return (
                <div key={group.key} className="space-y-2">
                  {hasMultiple ? (
                    <details open={isExpanded} className="group">
                      <summary
                        className="list-none cursor-pointer"
                        onClick={(event) => {
                          event.preventDefault();
                          toggleGroup(group.key);
                        }}
                        aria-expanded={isExpanded}
                      >
                        <Card className="transition-colors hover:bg-muted/50">
                          <CardContent className="flex items-center gap-3 p-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {entry.productName || "Unknown Product"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatDate(entry.date)}  -  {group.entries.length} run
                                  {group.entries.length > 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {getPlatformFromUrl(entry.url) && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {getPlatformFromUrl(entry.url)}
                                </Badge>
                              )}
                              <Badge
                                variant={getFraudBadgeVariant(entry.fraudVerdict)}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {entry.fraudVerdict === "Likely Fake"
                                  ? "Fake"
                                  : entry.fraudVerdict === "Likely Authentic"
                                    ? "Authentic"
                                    : "?"}
                              </Badge>
                              <Badge
                                variant={getSentimentBadgeVariant(entry.sentimentVerdict)}
                                className="text-[10px] px-1.5 py-0 capitalize"
                              >
                                {entry.sentimentVerdict !== "Unknown"
                                  ? entry.sentimentVerdict
                                  : "?"}
                              </Badge>
                              <ChevronIcon className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </CardContent>
                        </Card>
                      </summary>
                      <div className="space-y-1 pl-4">
                        {group.entries.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/results?historyId=${sub.id}`}
                            className="block"
                          >
                            <Card className="transition-colors hover:bg-muted/50">
                              <CardContent className="flex items-center gap-3 p-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">
                                    {sub.productName || "Unknown Product"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatDate(sub.date)}
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-1.5">
                                  {getPlatformFromUrl(sub.url) && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {getPlatformFromUrl(sub.url)}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant={getFraudBadgeVariant(sub.fraudVerdict)}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {sub.fraudVerdict === "Likely Fake"
                                      ? "Fake"
                                      : sub.fraudVerdict === "Likely Authentic"
                                        ? "Authentic"
                                        : "?"}
                                  </Badge>
                                  <Badge
                                    variant={getSentimentBadgeVariant(sub.sentimentVerdict)}
                                    className="text-[10px] px-1.5 py-0 capitalize"
                                  >
                                    {sub.sentimentVerdict !== "Unknown"
                                      ? sub.sentimentVerdict
                                      : "?"}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="flex items-center gap-3 p-3">
                        <button
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() => navigate(detailsHref)}
                          type="button"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {entry.productName || "Unknown Product"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDate(entry.date)}  -  {group.entries.length} run
                              {group.entries.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                        <div className="flex shrink-0 gap-1.5">
                          {getPlatformFromUrl(entry.url) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {getPlatformFromUrl(entry.url)}
                            </Badge>
                          )}
                          <Badge
                            variant={getFraudBadgeVariant(entry.fraudVerdict)}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {entry.fraudVerdict === "Likely Fake"
                              ? "Fake"
                              : entry.fraudVerdict === "Likely Authentic"
                                ? "Authentic"
                                : "?"}
                          </Badge>
                          <Badge
                            variant={getSentimentBadgeVariant(entry.sentimentVerdict)}
                            className="text-[10px] px-1.5 py-0 capitalize"
                          >
                            {entry.sentimentVerdict !== "Unknown"
                              ? entry.sentimentVerdict
                              : "?"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
          })}
        </div>
      )}

      {/* Clear history */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={() => setShowClearDialog(true)}
        >
          <TrashIcon />
          Clear History
        </Button>
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogHeader>
          <DialogTitle>Clear All History?</DialogTitle>
          <DialogDescription>
            This will permanently delete all {history.length} saved analysis
            results. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowClearDialog(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            Clear All
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
