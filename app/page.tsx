import { Suspense } from "react";
import Link from "next/link";
import { getMarkets, getAllMarkets } from "@/lib/get-markets";
import { computePulse } from "@/lib/pulse";
import type { PulseApiResponse } from "@/lib/types";
import MarketTable from "@/components/MarketTable";
import PulseDashboard from "@/components/PulseDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch market table data and Pulse data in parallel
  const [initialData, pulseMarkets] = await Promise.all([
    getMarkets({ sort: "movers", category: "all", offset: 0 }),
    getAllMarkets(),
  ]);

  const pulseIndices = computePulse(pulseMarkets);
  const initialPulse: PulseApiResponse = {
    indices: pulseIndices,
    computedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                P
              </div>
              <span className="font-semibold text-sm tracking-tight">Predmove</span>
            </div>
            {/* Pulse nav link */}
            <Link
              href="/pulse"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Pulse
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block tabular-nums">
              {initialData.totalMarkets.toLocaleString()} markets
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-0 pb-6 flex flex-col">
        {/* Predmove Pulse hero — above the fold */}
        <Suspense fallback={null}>
          <PulseDashboard initialData={initialPulse} />
        </Suspense>

        {/* Divider between Pulse and market table */}
        <div className="flex items-center gap-3 mb-0.5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
            Markets
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Suspense
          fallback={
            <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">
              Loading markets…
            </div>
          }
        >
          <MarketTable initialData={initialData} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Data via{" "}
            <a
              href="https://docs.polymarket.com/developers/gamma-markets-api/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Polymarket
            </a>{" "}
            &amp;{" "}
            <a
              href="https://docs.kalshi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Kalshi
            </a>
            . Not financial advice.
          </span>
          <span>Predmove is not affiliated with Polymarket or Kalshi.</span>
        </div>
      </footer>
    </div>
  );
}
