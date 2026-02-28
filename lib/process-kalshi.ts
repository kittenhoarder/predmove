import type { KalshiMarket, ProcessedMarket } from "./types";

/**
 * Maps Kalshi event-level category strings (exact API values) to Pulse-compatible slugs.
 * Keys are the literal strings returned by GET /events .category field.
 * Also includes lowercase variants for defensive fallback.
 */
const KALSHI_CATEGORY_MAP: Record<string, string> = {
  // Exact Kalshi API values (title-cased)
  "Politics": "politics",
  "Elections": "politics",
  "World": "geopolitics",
  "Financials": "economics",
  "Economics": "economics",
  "Science and Technology": "tech",
  "Climate and Weather": "climate",
  "Sports": "sports",
  "Entertainment": "entertainment",
  "Social": "general",
  "Health": "health",
  "Companies": "economics",
  "Transportation": "general",
  "Crypto": "crypto",
  // Lowercase fallbacks (used when category comes pre-lowercased)
  politics: "politics",
  elections: "politics",
  world: "geopolitics",
  financials: "economics",
  economics: "economics",
  "science and technology": "tech",
  "climate and weather": "climate",
  sports: "sports",
  entertainment: "entertainment",
  social: "general",
  health: "health",
  companies: "economics",
  transportation: "general",
  crypto: "crypto",
  // Legacy keys kept for any data already in the pipeline
  economy: "economics",
  technology: "tech",
  tech: "tech",
  political: "politics",
  climate: "climate",
  environment: "climate",
  science: "tech",
  geopolitics: "geopolitics",
  finance: "economics",
  business: "economics",
  general: "general",
};

// Maps Pulse slug to human-readable label
const CATEGORY_LABELS: Record<string, string> = {
  economics: "Economics",
  tech: "Tech",
  politics: "Politics",
  climate: "Climate",
  sports: "Sports",
  entertainment: "Entertainment",
  health: "Health",
  crypto: "Crypto",
  geopolitics: "Geopolitics",
  general: "General",
};

function normalizeCategory(raw: string | undefined): { slug: string; label: string } {
  // Try exact match first, then lowercase fallback
  const exact = raw ?? "general";
  const slug = KALSHI_CATEGORY_MAP[exact] ?? KALSHI_CATEGORY_MAP[exact.toLowerCase().trim()] ?? "general";
  const label = CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  return { slug, label };
}

/** Parse Kalshi FixedPoint dollar string to a 0–100 probability percentage. */
function fpToPrice(fp: string | undefined): number {
  const val = parseFloat(fp ?? "0");
  if (isNaN(val)) return 0;
  // Kalshi prices are in dollars where $1.00 = 100% probability
  return Math.round(val * 10000) / 100;
}

/** Parse Kalshi FixedPoint string to a plain number (volume, open interest). */
function fpToNumber(fp: string | undefined): number {
  const val = parseFloat(fp ?? "0");
  return isNaN(val) ? 0 : val;
}

/**
 * Transform a single KalshiMarket into a ProcessedMarket.
 * Returns null for markets that should be excluded (non-active, no pricing).
 */
function processKalshiMarket(market: KalshiMarket): ProcessedMarket | null {
  if (market.status !== "active") return null;
  if (!market.yes_ask_dollars && !market.last_price_dollars) return null;

  const currentPrice = fpToPrice(market.yes_ask_dollars || market.last_price_dollars);
  const bestBid = fpToPrice(market.yes_bid_dollars);
  const bestAsk = fpToPrice(market.yes_ask_dollars);
  const spread = Math.max(0, bestAsk - bestBid);

  const { slug, label } = normalizeCategory(market.category);

  // Kalshi doesn't expose per-market price change history via public API;
  // set changes to 0 — Pulse engine uses volume/open_interest signals instead
  const volume24h = fpToNumber(market.volume_24h_fp);
  const openInterest = fpToNumber(market.open_interest_fp);

  // Use open_interest as a liquidity proxy (liquidity_dollars is deprecated/zero)
  const liquidity = openInterest;

  // Build a human-readable event slug from the event_ticker for URL construction
  const eventSlug = market.event_ticker?.toLowerCase() ?? market.ticker.toLowerCase();

  return {
    id: market.ticker,
    question: market.title,
    source: "kalshi",
    eventSlug,
    eventTitle: market.title,
    categoryslugs: [slug],
    categories: [label],
    image: "",
    currentPrice,
    oneDayChange: 0,
    oneHourChange: 0,
    oneWeekChange: 0,
    oneMonthChange: 0,
    volume24h,
    volume1wk: 0,
    volume1mo: 0,
    liquidity,
    createdAt: market.open_time ?? new Date().toISOString(),
    endDate: market.close_time ?? "",
    outcomes: ["Yes", "No"],
    outcomePrices: [currentPrice / 100, 1 - currentPrice / 100],
    bestBid,
    bestAsk,
    spread,
    // Kalshi markets don't use CLOB token IDs; use ticker as a stable key for WS
    clobTokenId: market.ticker,
    description: "",
    resolutionSource: "https://kalshi.com",
    competitive: spread < 5 ? 1 : spread < 15 ? 0.5 : 0,
  };
}

/**
 * Process a list of KalshiMarket objects into ProcessedMarket[].
 * Skips inactive/unpriceable markets silently.
 */
export function processKalshiMarkets(markets: KalshiMarket[]): ProcessedMarket[] {
  const seen = new Set<string>();
  const result: ProcessedMarket[] = [];
  for (const m of markets) {
    if (seen.has(m.ticker)) continue;
    seen.add(m.ticker);
    const processed = processKalshiMarket(m);
    if (processed) result.push(processed);
  }
  return result;
}
