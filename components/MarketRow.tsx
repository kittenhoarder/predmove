"use client";

import { useState, useEffect } from "react";
import type { ProcessedMarket } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ExternalLink, ChevronDown, ChevronRight, Star, Link } from "lucide-react";
import ExpandedPanel from "./ExpandedPanel";
import { isWatchlisted, toggleWatchlist } from "@/lib/watchlist";

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

interface MarketRowProps {
  market: ProcessedMarket;
  rank: number;
  onWatchlistChange?: () => void;
}

export default function MarketRow({ market, rank, onWatchlistChange }: MarketRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [starred, setStarred] = useState(false);

  // Read from localStorage after mount (SSR safe)
  useEffect(() => {
    setStarred(isWatchlisted(market.id));
  }, [market.id]);

  const isPositive = market.oneDayChange > 0;
  const isNeutral = market.oneDayChange === 0;
  const polymarketUrl = `https://polymarket.com/event/${market.eventSlug}`;

  function handleStar(e: React.MouseEvent) {
    e.stopPropagation();
    const nowStarred = toggleWatchlist(market.id);
    setStarred(nowStarred);
    onWatchlistChange?.();
  }

  return (
    <>
      <TableRow
        className="group cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Rank + expand chevron */}
        <TableCell className="tabular-nums text-sm">
          <span className="flex items-center gap-1">
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            <span className="text-muted-foreground">{rank}</span>
          </span>
        </TableCell>

        {/* Market question + category badges */}
        <TableCell>
          <span
            className="text-sm font-medium leading-snug line-clamp-2 block"
            title={market.question}
          >
            {market.question}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {market.categories.slice(0, 2).map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 rounded-full font-normal"
              >
                {cat}
              </Badge>
            ))}
          </div>
        </TableCell>

        {/* Yes probability */}
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

        {/* Star + detail link + trade link */}
        <TableCell className="text-right w-16" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleStar}
              aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
              className={`transition-colors ${
                starred
                  ? "text-amber-400"
                  : "text-muted-foreground opacity-0 group-hover:opacity-100"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${starred ? "fill-amber-400" : ""}`} />
            </button>
            <a
              href={`/market/${market.eventSlug}`}
              aria-label={`Detail page for ${market.question}`}
              className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <Link className="w-3 h-3" />
            </a>
            <a
              href={polymarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${market.question} on Polymarket`}
              className="inline-flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </TableCell>
      </TableRow>

      {/* Expansion row — colSpan covers all 7 fixed columns; no padding so panel fills edge-to-edge */}
      {expanded && (
        <TableRow className="hover:bg-transparent border-0">
          <TableCell colSpan={7} className="p-0">
            <ExpandedPanel market={market} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
