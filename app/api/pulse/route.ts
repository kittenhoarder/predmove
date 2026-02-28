import { NextResponse } from "next/server";
import { getAllMarkets } from "@/lib/get-markets";
import { computePulse } from "@/lib/pulse";
import type { PulseApiResponse } from "@/lib/types";

export async function GET() {
  const markets = await getAllMarkets();
  const indices = computePulse(markets);

  const body: PulseApiResponse = {
    indices,
    computedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
