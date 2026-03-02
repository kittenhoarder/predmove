import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPulseApi } from "../pulse-client";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchPulseApi", () => {
  it("returns /api/pulse payload when available", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/pulse") {
        return jsonResponse({
          indices: [{ category: "economics", score: 60 }],
          computedAt: "2026-01-01T00:00:00.000Z",
        });
      }
      throw new Error("unexpected fallback call");
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const out = await fetchPulseApi("/api/pulse");

    expect(out.indices).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/pulse", expect.any(Object));
  });

  it("falls back to /api/indices directional payload", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/pulse") {
        return jsonResponse({ error: "boom" }, 500);
      }
      if (url === "/api/indices?family=directional&horizon=24h&sourceScope=core") {
        return jsonResponse({
          indices: [
            {
              category: "economics",
              label: "Economics",
              family: "directional",
              horizon: "24h",
              score: 81,
              delta24h: 3,
              confidence: 88,
              coverage: { marketCoverage: 80, oiCoverage: { orderflow: 40, smartMoney: 0 }, featureCoverage: 75 },
              diagnostics: {
                freshness: 90,
                sourceAgreement: 70,
                featureCoverage: 75,
                includedSignals: ["momentum"],
                excludedSignals: ["smartMoney"],
                rawSignals: {},
              },
              signals: { momentum: 78, flow: 66, breadth: 61 },
              marketCount: { polymarket: 3, kalshi: 2, manifold: 0, total: 5 },
              topMarkets: [],
              history: [],
              computedAt: "2026-01-01T00:00:00.000Z",
              sourceScope: "core",
            },
          ],
          family: "directional",
          horizon: "24h",
          sourceScope: "core",
          computedAt: "2026-01-01T00:00:00.000Z",
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const out = await fetchPulseApi("/api/pulse");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.indices).toHaveLength(1);
    expect(out.indices[0].family).toBe("directional");
    expect(out.indices[0].band).toBe("Extreme Bullish");
  });
});
