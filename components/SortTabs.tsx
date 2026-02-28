"use client";

import { Button } from "@/components/ui/button";
import type { SortMode } from "@/lib/types";

interface Tab {
  id: SortMode;
  label: string;
  shortLabel: string;
}

const TABS: Tab[] = [
  { id: "movers",    label: "Biggest Movers",  shortLabel: "Movers" },
  { id: "gainers",   label: "Top Gainers",     shortLabel: "Gainers" },
  { id: "losers",    label: "Top Losers",      shortLabel: "Losers" },
  { id: "liquidity", label: "Most Liquid",     shortLabel: "Liquid" },
  { id: "volume",    label: "Highest Volume",  shortLabel: "Volume" },
  { id: "new",       label: "New Markets",     shortLabel: "New" },
];

interface SortTabsProps {
  active: SortMode;
  onChange: (sort: SortMode) => void;
}

export default function SortTabs({ active, onChange }: SortTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Sort markets by"
      className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none sm:flex-wrap"
    >
      {TABS.map((tab) => (
        <Button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          variant={active === tab.id ? "default" : "secondary"}
          size="sm"
          onClick={() => onChange(tab.id)}
          className="rounded-full shrink-0"
        >
          <span className="sm:hidden">{tab.shortLabel}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </Button>
      ))}
    </div>
  );
}
