"use client";

import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { PulseIndex } from "@/lib/types";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

// Band → Tailwind color tokens
const BAND_COLORS: Record<PulseIndex["band"], { text: string; ring: string; fill: string; arc: string }> = {
  "Extreme Bearish": { text: "text-red-500", ring: "ring-red-500/30", fill: "fill-red-500/10", arc: "#ef4444" },
  "Bearish":         { text: "text-orange-400", ring: "ring-orange-400/30", fill: "fill-orange-400/10", arc: "#fb923c" },
  "Neutral":         { text: "text-zinc-400", ring: "ring-zinc-400/30", fill: "fill-zinc-400/10", arc: "#71717a" },
  "Bullish":         { text: "text-teal-400", ring: "ring-teal-400/30", fill: "fill-teal-400/10", arc: "#2dd4bf" },
  "Extreme Bullish": { text: "text-emerald-400", ring: "ring-emerald-500/30", fill: "fill-emerald-500/10", arc: "#34d399" },
};

interface ArcGaugeProps {
  score: number;
  band: PulseIndex["band"];
  size?: number;
}

/**
 * SVG semicircle arc gauge.
 * The track is a 180° arc; the fill arc sweeps from 0% to score/100.
 */
function ArcGauge({ score, band, size = 100 }: ArcGaugeProps) {
  const { arc } = BAND_COLORS[band];
  const cx = size / 2;
  const cy = size / 2 + 8; // shift center down so the arc sits nicely
  const r = size * 0.38;
  const strokeWidth = size * 0.08;

  // Describe a semicircle arc path from angle start to end (in degrees, 0=right)
  function describeArc(startDeg: number, endDeg: number, radius: number): string {
    const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(toRad(startDeg));
    const y1 = cy + radius * Math.sin(toRad(startDeg));
    const x2 = cx + radius * Math.cos(toRad(endDeg));
    const y2 = cy + radius * Math.sin(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  }

  // Track: -180° to 0° (full semicircle, left to right)
  const trackPath = describeArc(-180, 0, r);
  // Fill: -180° to -180 + score/100 * 180°
  const fillEnd = -180 + (score / 100) * 180;
  const fillPath = score > 0 ? describeArc(-180, Math.min(fillEnd, 0), r) : null;

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`} aria-hidden="true">
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="text-muted/30"
      />
      {/* Fill arc */}
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={arc}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

interface PulseCardProps {
  index: PulseIndex;
  /** When true, renders a slightly larger card suited for the /pulse page */
  large?: boolean;
}

export default function PulseCard({ index, large = false }: PulseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = BAND_COLORS[index.band];
  const hasDelta = index.delta24h !== 0;
  const deltaPositive = index.delta24h > 0;

  const sparkData = index.history.map((s) => ({ v: s.score }));

  return (
    <div
      className={`rounded-xl border border-border bg-card transition-shadow hover:shadow-md cursor-pointer select-none ${
        large ? "p-5" : "p-4"
      }`}
      onClick={() => setExpanded((e) => !e)}
      role="button"
      aria-expanded={expanded}
    >
      {/* Header row: label + expand chevron */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground`}>
          {index.label}
        </span>
        <span className="text-muted-foreground/50">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </div>

      {/* Arc gauge + score */}
      <div className="flex flex-col items-center my-1">
        <ArcGauge score={index.score} band={index.band} size={large ? 120 : 96} />
        <div className={`text-3xl font-bold tabular-nums -mt-1 ${colors.text}`}>
          {index.score}
        </div>
        <div className={`text-xs font-semibold mt-0.5 ${colors.text}`}>
          {index.band}
        </div>
      </div>

      {/* 24h delta */}
      {hasDelta && (
        <div className={`text-xs text-center mt-1 tabular-nums font-medium ${
          deltaPositive ? "text-emerald-400" : "text-red-400"
        }`}>
          {deltaPositive ? "▲" : "▼"} {Math.abs(index.delta24h).toFixed(1)} 24h
        </div>
      )}

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div className={`mt-3 ${large ? "h-12" : "h-8"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`pulse-grad-${index.category}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BAND_COLORS[index.band].arc} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BAND_COLORS[index.band].arc} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={BAND_COLORS[index.band].arc}
                strokeWidth={1.5}
                fill={`url(#pulse-grad-${index.category})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Market count + source breakdown */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground/70">
        <span>{index.marketCount.total} markets</span>
        <span className="flex items-center gap-1.5">
          {index.marketCount.polymarket > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
              {index.marketCount.polymarket}P
            </span>
          )}
          {index.marketCount.kalshi > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400" />
              {index.marketCount.kalshi}K
            </span>
          )}
        </span>
      </div>

      {/* Expanded: signal breakdown + top markets */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-border space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Signal bars */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Signal Breakdown
            </p>
            <div className="space-y-1.5">
              {(
                [
                  { key: "prob", label: "Wtd Probability", pct: "30%" },
                  { key: "volWeighted", label: "Vol-Wtd Prob", pct: "20%" },
                  { key: "momentum", label: "7d Momentum", pct: "20%" },
                  { key: "breadth", label: "Market Breadth", pct: "15%" },
                  { key: "decay", label: "Time-Decay", pct: "10%" },
                  { key: "consensus", label: "Cross-Platform", pct: "5%" },
                ] as const
              ).map(({ key, label, pct }) => {
                const val = index.signals[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/70 w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${val}%`, backgroundColor: BAND_COLORS[index.band].arc }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right">{val}</span>
                    <span className="text-[10px] text-muted-foreground/40 w-6">{pct}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top markets */}
          {index.topMarkets.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Top Markets
              </p>
              <div className="space-y-1.5">
                {index.topMarkets.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span
                      className={`inline-flex shrink-0 items-center justify-center w-3.5 h-3.5 rounded-sm text-[8px] font-bold ${
                        m.source === "kalshi" ? "bg-sky-500/20 text-sky-400" : "bg-indigo-500/20 text-indigo-400"
                      }`}
                    >
                      {m.source === "kalshi" ? "K" : "P"}
                    </span>
                    <span className="text-xs text-foreground/80 line-clamp-1 flex-1">{m.question}</span>
                    <span className="text-xs tabular-nums font-semibold shrink-0">
                      {m.currentPrice.toFixed(1)}%
                    </span>
                    {m.source === "polymarket" ? (
                      <a
                        href={`https://polymarket.com/event/${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <a
                        href={`https://kalshi.com/markets/${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
