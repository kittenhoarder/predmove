import { fetchAllActiveEvents, fetchTags } from "./gamma";
import { buildTagMap, processEvents } from "./process-markets";
import { fetchAllKalshiMarkets } from "./kalshi";
import { processKalshiMarkets } from "./process-kalshi";
import type { ProcessedMarket, SortMode, MarketsApiResponse } from "./types";

const PAGE_LIMIT = 100;

function filterByCategory(
  markets: ProcessedMarket[],
  category: string
): ProcessedMarket[] {
  if (!category || category === "all") return markets;
  const lower = category.toLowerCase();
  return markets.filter(
    (m) =>
      m.categoryslugs.includes(lower) ||
      m.categories.some((c) => c.toLowerCase().includes(lower))
  );
}

function sortMarkets(
  markets: ProcessedMarket[],
  sort: SortMode,
  watchlistIds?: string[]
): ProcessedMarket[] {
  const copy = [...markets];
  switch (sort) {
    case "movers1h":
      return copy.sort(
        (a, b) => Math.abs(b.oneHourChange) - Math.abs(a.oneHourChange)
      );
    case "gainers":
      return copy
        .filter((m) => m.oneDayChange > 0)
        .sort((a, b) => b.oneDayChange - a.oneDayChange);
    case "losers":
      return copy
        .filter((m) => m.oneDayChange < 0)
        .sort((a, b) => a.oneDayChange - b.oneDayChange);
    case "volume":
      return copy.sort((a, b) => b.volume24h - a.volume24h);
    case "liquidity":
      return copy.sort((a, b) => b.liquidity - a.liquidity);
    case "new":
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "watchlist": {
      const ids = new Set(watchlistIds ?? []);
      return copy
        .filter((m) => ids.has(m.id))
        .sort((a, b) => Math.abs(b.oneDayChange) - Math.abs(a.oneDayChange));
    }
    case "movers":
    default:
      return copy.sort(
        (a, b) => Math.abs(b.oneDayChange) - Math.abs(a.oneDayChange)
      );
  }
}

export interface GetMarketsOptions {
  sort?: SortMode;
  category?: string;
  offset?: number;
  /** Comma-separated market IDs for the watchlist sort mode */
  watchlistIds?: string[];
  /** When set, only return markets from this source */
  source?: "polymarket" | "kalshi" | "all";
}

/**
 * Fetch all active markets from Polymarket and Kalshi in parallel, merge,
 * sort, filter, and return a paginated response.
 * Kalshi failures are non-fatal: if the Kalshi API is down, the merge
 * continues with Polymarket data only.
 */
export async function getMarkets(
  opts: GetMarketsOptions = {}
): Promise<MarketsApiResponse> {
  const sort: SortMode = opts.sort ?? "movers";
  const category = opts.category ?? "all";
  const offset = opts.offset ?? 0;
  const watchlistIds = opts.watchlistIds ?? [];
  const source = opts.source ?? "all";
  const fetchedAt = new Date().toISOString();

  // Fetch both sources in parallel; each catches its own errors
  const [polymarkets, kalshiMarkets] = await Promise.all([
    (async (): Promise<ProcessedMarket[]> => {
      try {
        const [events, tags] = await Promise.all([fetchAllActiveEvents(), fetchTags()]);
        const tagMap = buildTagMap(tags);
        return processEvents(events, tagMap);
      } catch (err) {
        console.error("[get-markets] Polymarket fetch failed:", err);
        return [];
      }
    })(),
    (async (): Promise<ProcessedMarket[]> => {
      try {
        const raw = await fetchAllKalshiMarkets();
        return processKalshiMarkets(raw);
      } catch (err) {
        console.error("[get-markets] Kalshi fetch failed:", err);
        return [];
      }
    })(),
  ]);

  // Merge, optionally filter by source
  let markets: ProcessedMarket[] = [...polymarkets, ...kalshiMarkets];
  if (source === "polymarket") markets = polymarkets;
  else if (source === "kalshi") markets = kalshiMarkets;

  const filtered = filterByCategory(markets, category);
  const sorted = sortMarkets(filtered, sort, watchlistIds);
  const paginated = sorted.slice(offset, offset + PAGE_LIMIT);

  return {
    markets: paginated,
    cachedAt: fetchedAt,
    totalMarkets: filtered.length,
    fromCache: false,
  };
}

/**
 * Fetch all active markets from both sources without pagination.
 * Used internally by the Pulse engine which needs the full corpus.
 */
export async function getAllMarkets(): Promise<ProcessedMarket[]> {
  const [polymarkets, kalshiMarkets] = await Promise.all([
    (async (): Promise<ProcessedMarket[]> => {
      try {
        const [events, tags] = await Promise.all([fetchAllActiveEvents(), fetchTags()]);
        const tagMap = buildTagMap(tags);
        return processEvents(events, tagMap);
      } catch (err) {
        console.error("[get-markets] Polymarket fetch failed (pulse):", err);
        return [];
      }
    })(),
    (async (): Promise<ProcessedMarket[]> => {
      try {
        const raw = await fetchAllKalshiMarkets();
        return processKalshiMarkets(raw);
      } catch (err) {
        console.error("[get-markets] Kalshi fetch failed (pulse):", err);
        return [];
      }
    })(),
  ]);
  return [...polymarkets, ...kalshiMarkets];
}
