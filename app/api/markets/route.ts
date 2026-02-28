import { NextRequest, NextResponse } from "next/server";
import { getMarkets } from "@/lib/get-markets";
import type { SortMode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") ?? "movers") as SortMode;
  const category = searchParams.get("category") ?? "all";
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  // Watchlist IDs passed as comma-separated string from client localStorage
  const watchlistParam = searchParams.get("watchlist") ?? "";
  const watchlistIds = watchlistParam ? watchlistParam.split(",").filter(Boolean) : [];

  const data = await getMarkets({ sort, category, offset, watchlistIds });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
