"use client";

import {
  Globe2,
  MapPin,
  Bitcoin,
  Trophy,
  Clapperboard,
  TrendingUp,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { value: "all",           label: "All",       icon: Globe2 },
  { value: "Politics",      label: "Politics",  icon: MapPin },
  { value: "Crypto",        label: "Crypto",    icon: Bitcoin },
  { value: "Sports",        label: "Sports",    icon: Trophy },
  { value: "Entertainment", label: "Entertain", icon: Clapperboard },
  { value: "Economics",     label: "Economics", icon: TrendingUp },
  { value: "Science",       label: "Science",   icon: FlaskConical },
  { value: "Pop Culture",   label: "Pop",       icon: Sparkles },
] as const;

interface CategoryFilterProps {
  active: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none" aria-label="Filter by category">
      {CATEGORIES.map(({ value, label, icon: Icon }) => {
        const isActive = active === value;
        return (
          <Button
            key={value}
            variant={isActive ? "outline" : "ghost"}
            size="sm"
            onClick={() => onChange(value)}
            className={`rounded-full text-xs h-7 shrink-0 gap-1.5 ${
              isActive ? "border-primary text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
