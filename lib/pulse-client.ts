import type { IndicesApiResponse, PulseApiResponse, PulseIndex } from "@/lib/types";

const REQUEST_TIMEOUT_MS = 12_000;

function pulseBand(score: number): PulseIndex["band"] {
  if (score <= 20) return "Extreme Bearish";
  if (score <= 40) return "Bearish";
  if (score <= 60) return "Neutral";
  if (score <= 80) return "Bullish";
  return "Extreme Bullish";
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function mapDirectionalToPulse(data: IndicesApiResponse): PulseApiResponse {
  const indices: PulseIndex[] = data.indices
    .filter((idx) => idx.family === "directional")
    .map((idx) => ({
      category: idx.category,
      label: idx.label,
      score: idx.score,
      band: pulseBand(idx.score),
      delta24h: idx.delta24h,
      signals: {
        momentum: Math.round(idx.signals.momentum ?? 50),
        flow: Math.round(idx.signals.flow ?? 50),
        breadth: Math.round(idx.signals.breadth ?? 50),
        acceleration: Math.round(idx.signals.acceleration ?? 50),
        level: Math.round(idx.signals.level ?? 50),
      },
      marketCount: idx.marketCount,
      topMarkets: idx.topMarkets,
      history: idx.history,
      computedAt: idx.computedAt,
      confidence: idx.confidence,
      coverage: idx.coverage,
      family: idx.family,
      horizon: idx.horizon,
      diagnostics: idx.diagnostics,
    }));

  return {
    indices,
    computedAt: data.computedAt,
  };
}

/**
 * Client-side fetcher with graceful degradation:
 * 1) Prefer legacy /api/pulse contract
 * 2) Fallback to directional /api/indices when /api/pulse fails or returns empty
 */
export async function fetchPulseApi(url: string): Promise<PulseApiResponse> {
  try {
    const pulse = await fetchJson<PulseApiResponse>(url);
    if (pulse.indices.length > 0) return pulse;
  } catch {
    // Fall through to /api/indices fallback.
  }

  const directional = await fetchJson<IndicesApiResponse>("/api/indices?family=directional&horizon=24h&sourceScope=core");
  return mapDirectionalToPulse(directional);
}
