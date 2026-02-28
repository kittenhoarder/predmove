import type { KalshiMarket, KalshiSeries } from "./types";

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const FETCH_TIMEOUT_MS = 15_000;
// Max events per page (Kalshi allows up to 200)
const EVENTS_PAGE_LIMIT = 200;
// Fetch up to 5 pages of events = up to 1,000 events
const MAX_EVENT_PAGES = 5;
// Max concurrent market fetches when batching per-event requests
const MAX_CONCURRENT_MARKET_FETCHES = 10;

async function fetchWithTimeout(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

interface KalshiEventSummary {
  event_ticker: string;
  category: string;
  title: string;
  series_ticker: string;
}

/**
 * Fetch one page of Kalshi events.
 * Events have a `category` field directly (e.g. "Politics", "Climate and Weather").
 * Returns { events, cursor } where cursor is null on the last page.
 */
async function fetchEventsPage(
  cursor?: string
): Promise<{ events: KalshiEventSummary[]; cursor: string | null }> {
  const params = new URLSearchParams({ limit: String(EVENTS_PAGE_LIMIT) });
  if (cursor) params.set("cursor", cursor);

  const url = `${KALSHI_BASE}/events?${params.toString()}`;
  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[kalshi] ${res.status} fetching events: ${body}`);
    return { events: [], cursor: null };
  }

  const data = await res.json();
  const events: KalshiEventSummary[] = (data.events ?? []).map(
    (e: Record<string, unknown>) => ({
      event_ticker: String(e.event_ticker ?? ""),
      category: String(e.category ?? "general"),
      title: String(e.title ?? ""),
      series_ticker: String(e.series_ticker ?? ""),
    })
  );
  return { events, cursor: data.cursor ?? null };
}

/**
 * Fetch all markets for a single event ticker.
 * Returns an empty array on any error so one bad event doesn't block the rest.
 */
async function fetchMarketsForEvent(
  eventTicker: string,
  category: string
): Promise<KalshiMarket[]> {
  const params = new URLSearchParams({
    event_ticker: eventTicker,
    limit: "100",
  });
  const url = `${KALSHI_BASE}/markets?${params.toString()}`;
  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    console.warn(`[kalshi] ${res.status} fetching markets for event ${eventTicker}`);
    return [];
  }

  const data = await res.json();
  const markets: KalshiMarket[] = data.markets ?? [];
  // Annotate each market with the event-level category (more reliable than series lookup)
  return markets.map((m) => ({ ...m, category, series_ticker: m.event_ticker?.split("-")[0] }));
}

/**
 * Fetch all active Kalshi series (exported for external use if needed).
 */
export async function fetchKalshiSeries(): Promise<KalshiSeries[]> {
  const params = new URLSearchParams({ limit: "200" });
  const url = `${KALSHI_BASE}/series?${params.toString()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.warn(`[kalshi] Failed to fetch series: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.series ?? [];
}

/**
 * Fetch all active Kalshi markets via the events topology:
 *   1. Paginate /events (up to MAX_EVENT_PAGES × 200 = 1,000 events)
 *   2. Batch-fetch /markets?event_ticker=X in groups of MAX_CONCURRENT_MARKET_FETCHES
 *   3. Each market is annotated with the event-level category string
 *
 * This is the correct approach because:
 *   - The raw /markets paginator returns MVE (sports-parlay) markets first, which are unpriced
 *   - /events includes the `category` field directly (no series lookup required)
 *   - Standard binary markets (politics, crypto, etc.) are reliably accessible via event_ticker filter
 */
export async function fetchAllKalshiMarkets(): Promise<KalshiMarket[]> {
  // Step 1: Collect all event summaries across pages
  const allEvents: KalshiEventSummary[] = [];
  let cursor: string | null | undefined = undefined;

  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    const result = await fetchEventsPage(cursor ?? undefined);
    allEvents.push(...result.events);
    cursor = result.cursor;
    if (!cursor) break;
  }

  if (allEvents.length === 0) return [];

  // Step 2: Batch-fetch markets for all events, MAX_CONCURRENT at a time
  const allMarkets: KalshiMarket[] = [];

  for (let i = 0; i < allEvents.length; i += MAX_CONCURRENT_MARKET_FETCHES) {
    const batch = allEvents.slice(i, i + MAX_CONCURRENT_MARKET_FETCHES);
    const results = await Promise.all(
      batch.map((e) => fetchMarketsForEvent(e.event_ticker, e.category))
    );
    for (const markets of results) {
      allMarkets.push(...markets);
    }
  }

  return allMarkets;
}
