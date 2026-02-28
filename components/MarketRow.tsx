import type { ProcessedMarket } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}pp`;
}

interface MarketRowProps {
  market: ProcessedMarket;
  rank: number;
}

export default function MarketRow({ market, rank }: MarketRowProps) {
  const isPositive = market.oneDayChange > 0;
  const isNeutral = market.oneDayChange === 0;
  const polymarketUrl = `https://polymarket.com/event/${market.eventSlug}`;

  return (
    <TableRow className="group">
      {/* Rank */}
      <TableCell className="w-10 text-muted-foreground tabular-nums text-sm">
        {rank}
      </TableCell>

      {/* Market question + categories */}
      <TableCell>
        <a
          href={polymarketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
          title={market.question}
        >
          {market.question}
        </a>
        <div className="flex flex-wrap gap-1 mt-1">
          {market.categories.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full font-normal">
              {cat}
            </Badge>
          ))}
        </div>
      </TableCell>

      {/* Yes price */}
      <TableCell className="text-right tabular-nums">
        <span className="text-sm font-semibold">
          {market.currentPrice.toFixed(1)}%
        </span>
      </TableCell>

      {/* 24h change */}
      <TableCell className="text-right tabular-nums">
        <Badge
          variant="outline"
          className={`text-xs font-semibold rounded-full ${
            isNeutral
              ? "text-muted-foreground border-border"
              : isPositive
                ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                : "text-red-500 border-red-500/30 bg-red-500/10"
          }`}
        >
          {formatChange(market.oneDayChange)}
        </Badge>
      </TableCell>

      {/* 24h volume */}
      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
        {formatCurrency(market.volume24h)}
      </TableCell>

      {/* Liquidity */}
      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
        {formatCurrency(market.liquidity)}
      </TableCell>

      {/* Trade link — visible on row hover */}
      <TableCell className="text-right w-16">
        <a
          href={polymarketUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${market.question} on Polymarket`}
          className="inline-flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Trade <ExternalLink className="w-3 h-3" />
        </a>
      </TableCell>
    </TableRow>
  );
}
