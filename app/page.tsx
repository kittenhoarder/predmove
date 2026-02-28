import { Suspense } from "react";
import { getMarkets } from "@/lib/get-markets";
import MarketTable from "@/components/MarketTable";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialData = await getMarkets({ sort: "movers", category: "all", offset: 0 });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              P
            </div>
            <span className="font-semibold text-sm tracking-tight">Predmove</span>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <span className="text-xs text-muted-foreground hidden sm:block">
              Polymarket Movers
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {initialData.totalMarkets.toLocaleString()} active markets
            </span>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <a
              href="https://polymarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Polymarket ↗
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-6">
        {/* Hero */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Today&apos;s Biggest Movers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track price movements, volume, and liquidity across Polymarket prediction markets.
          </p>
        </div>

        {/* Dashboard */}
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
              Polymarket Gamma API
            </a>
            . Not financial advice.
          </span>
          <span>Predmove is not affiliated with Polymarket.</span>
        </div>
      </footer>
    </div>
  );
}
