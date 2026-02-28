import type { ProcessedMarket, PulseIndex, PulseSnapshot } from "./types";

// Categories surfaced in Pulse (slug → label)
export const PULSE_CATEGORIES: Record<string, string> = {
  politics: "Politics",
  economics: "Economics",
  crypto: "Crypto",
  tech: "Tech",
  climate: "Climate",
  sports: "Sports",
  entertainment: "Entertainment",
  geopolitics: "Geopolitics",
};

// In-memory snapshot history per category: up to 48 hourly snapshots
// Module-level so it persists across requests within the same serverless instance
const snapshotHistory = new Map<string, PulseSnapshot[]>();
const MAX_SNAPSHOTS = 48;

// Timestamp of the last snapshot taken (to avoid writing multiple per minute)
let lastSnapshotAt = 0;
const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Map a value from [fromMin, fromMax] to [0, 100]. */
function mapRange(val: number, fromMin: number, fromMax: number): number {
  if (fromMax === fromMin) return 50;
  return clamp(((val - fromMin) / (fromMax - fromMin)) * 100, 0, 100);
}

function getPulseLabel(score: number): PulseIndex["band"] {
  if (score <= 20) return "Extreme Bearish";
  if (score <= 40) return "Bearish";
  if (score <= 60) return "Neutral";
  if (score <= 80) return "Bullish";
  return "Extreme Bullish";
}

/**
 * Compute the Pulse score for a set of markets in a single category.
 *
 * Formula:
 *   Pulse = 0.30 × S_prob
 *         + 0.20 × S_momentum
 *         + 0.15 × S_breadth
 *         + 0.20 × S_volWeighted
 *         + 0.10 × S_decay
 *         + 0.05 × S_consensus
 *
 * Each signal S is normalized to [0, 100].
 */
function computeCategoryPulse(
  categorySlug: string,
  markets: ProcessedMarket[]
): Omit<PulseIndex, "history" | "delta24h"> | null {
  if (markets.length === 0) return null;

  const now = Date.now();
  const polyMarkets = markets.filter((m) => m.source === "polymarket");
  const kalshiMarkets = markets.filter((m) => m.source === "kalshi");
  const manifoldMarkets = markets.filter((m) => m.source === "manifold");

  // --- S_prob: open-interest-weighted average probability ---
  let sumOI = 0;
  let sumOIProb = 0;
  for (const m of markets) {
    const oi = m.liquidity > 0 ? m.liquidity : 1;
    const p = m.currentPrice / 100;
    sumOI += oi;
    sumOIProb += oi * p;
  }
  const S_prob = sumOI > 0 ? clamp((sumOIProb / sumOI) * 100, 0, 100) : 50;

  // --- S_momentum: OI-weighted 7-day change, mapped [-20pp, +20pp] → [0, 100] ---
  let sumMomOI = 0;
  let sumMomWeighted = 0;
  for (const m of markets) {
    const oi = m.liquidity > 0 ? m.liquidity : 1;
    sumMomOI += oi;
    sumMomWeighted += oi * m.oneWeekChange;
  }
  const avgMomentum = sumMomOI > 0 ? sumMomWeighted / sumMomOI : 0;
  const S_momentum = mapRange(avgMomentum, -20, 20);

  // --- S_breadth: % of markets with positive 24h change ---
  const bullishCount = markets.filter((m) => m.oneDayChange > 0).length;
  const S_breadth = (bullishCount / markets.length) * 100;

  // --- S_volWeighted: volume-24h-weighted average probability ---
  let sumVol = 0;
  let sumVolProb = 0;
  for (const m of markets) {
    const vol = m.volume24h > 0 ? m.volume24h : 0;
    sumVol += vol;
    sumVolProb += vol * (m.currentPrice / 100);
  }
  // Fallback to equal-weighted if no volume data (common for Kalshi)
  const S_volWeighted = sumVol > 0
    ? clamp((sumVolProb / sumVol) * 100, 0, 100)
    : S_prob;

  // --- S_decay: time-decay-weighted probability (nearer expiries weighted higher) ---
  let sumDecay = 0;
  let sumDecayProb = 0;
  for (const m of markets) {
    const daysToExpiry = m.endDate
      ? Math.max(1, (new Date(m.endDate).getTime() - now) / (1000 * 60 * 60 * 24))
      : 365;
    const w = 1 / daysToExpiry;
    sumDecay += w;
    sumDecayProb += w * (m.currentPrice / 100);
  }
  const S_decay = sumDecay > 0 ? clamp((sumDecayProb / sumDecay) * 100, 0, 100) : S_prob;

  // --- S_consensus: penalize cross-platform disagreement (avg gap across all source pairs) ---
  let S_consensus = 100;
  const sourceAvgs: number[] = [];
  if (polyMarkets.length > 0) {
    sourceAvgs.push(polyMarkets.reduce((acc, m) => acc + m.currentPrice, 0) / polyMarkets.length);
  }
  if (kalshiMarkets.length > 0) {
    sourceAvgs.push(kalshiMarkets.reduce((acc, m) => acc + m.currentPrice, 0) / kalshiMarkets.length);
  }
  if (manifoldMarkets.length > 0) {
    sourceAvgs.push(manifoldMarkets.reduce((acc, m) => acc + m.currentPrice, 0) / manifoldMarkets.length);
  }
  if (sourceAvgs.length >= 2) {
    let totalGap = 0;
    let pairs = 0;
    for (let i = 0; i < sourceAvgs.length; i++) {
      for (let j = i + 1; j < sourceAvgs.length; j++) {
        totalGap += Math.abs(sourceAvgs[i] - sourceAvgs[j]);
        pairs++;
      }
    }
    const avgGap = pairs > 0 ? totalGap / pairs : 0;
    S_consensus = clamp(100 - avgGap * 5, 0, 100);
  }

  const score = Math.round(
    0.30 * S_prob +
    0.20 * S_momentum +
    0.15 * S_breadth +
    0.20 * S_volWeighted +
    0.10 * S_decay +
    0.05 * S_consensus
  );

  // Top 5 markets by open interest
  const topMarkets = [...markets]
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      question: m.question,
      currentPrice: m.currentPrice,
      source: m.source,
    }));

  return {
    category: categorySlug,
    label: PULSE_CATEGORIES[categorySlug] ?? categorySlug,
    score,
    band: getPulseLabel(score),
    signals: {
      prob: Math.round(S_prob),
      momentum: Math.round(S_momentum),
      breadth: Math.round(S_breadth),
      volWeighted: Math.round(S_volWeighted),
      decay: Math.round(S_decay),
      consensus: Math.round(S_consensus),
    },
    marketCount: {
      polymarket: polyMarkets.length,
      kalshi: kalshiMarkets.length,
      manifold: manifoldMarkets.length,
      total: markets.length,
    },
    topMarkets,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Record an hourly snapshot for a category if enough time has elapsed.
 * Capped at MAX_SNAPSHOTS entries; oldest dropped first (ring buffer).
 */
function maybeRecordSnapshot(category: string, score: number): void {
  const now = Date.now();
  if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;

  const entry: PulseSnapshot = {
    timestamp: new Date(now).toISOString(),
    score,
  };
  const history = snapshotHistory.get(category) ?? [];
  history.push(entry);
  if (history.length > MAX_SNAPSHOTS) history.shift();
  snapshotHistory.set(category, history);
}

/** Flush snapshots for all categories at the same instant to keep histories aligned. */
function maybeFlushAllSnapshots(indices: Array<{ category: string; score: number }>): void {
  const now = Date.now();
  if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;
  lastSnapshotAt = now;
  for (const { category, score } of indices) {
    maybeRecordSnapshot(category, score);
  }
}

/**
 * Compute Pulse indices for all tracked categories from the given market corpus.
 * Also records hourly snapshots (in-memory, persists within serverless instance lifetime).
 */
export function computePulse(markets: ProcessedMarket[]): PulseIndex[] {
  // Group markets by their primary category slug
  const byCategory = new Map<string, ProcessedMarket[]>();
  for (const slug of Object.keys(PULSE_CATEGORIES)) {
    byCategory.set(slug, []);
  }

  for (const market of markets) {
    for (const slug of market.categoryslugs) {
      if (byCategory.has(slug)) {
        byCategory.get(slug)!.push(market);
      }
    }
  }

  const partial: Array<{ category: string; score: number }> = [];
  const results: Array<Omit<PulseIndex, "history" | "delta24h"> & { category: string }> = [];

  for (const [slug, catMarkets] of Array.from(byCategory.entries())) {
    const computed = computeCategoryPulse(slug, catMarkets);
    if (computed) {
      results.push(computed);
      partial.push({ category: slug, score: computed.score });
    }
  }

  // Flush snapshots once (aligned timestamp for all categories)
  maybeFlushAllSnapshots(partial);

  // Attach history + compute delta24h
  return results.map((r) => {
    const history = snapshotHistory.get(r.category) ?? [];
    const oldest = history.length >= 24 ? history[history.length - 24] : history[0];
    const delta24h = oldest ? Math.round((r.score - oldest.score) * 10) / 10 : 0;
    return { ...r, history: [...history], delta24h };
  });
}
