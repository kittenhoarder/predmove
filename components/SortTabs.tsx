"use client";

import { Button } from "@/components/ui/button";
import type { SortMode } from "@/lib/types";

interface Tab {
  id: SortMode;
  label: string;
}

const TABS: Tab[] = [
  { id: "movers",    label: "Biggest Movers" },
  { id: "gainers",   label: "Top Gainers" },
  { id: "losers",    label: "Top Losers" },
  { id: "liquidity", label: "Most Liquid" },
  { id: "volume",    label: "Highest Volume" },
  { id: "new",       label: "New Markets" },
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
      className="flex flex-wrap gap-1.5"
    >
      {TABS.map((tab) => (
        <Button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          variant={active === tab.id ? "default" : "secondary"}
          size="sm"
          onClick={() => onChange(tab.id)}
          className="rounded-full"
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
