import { NextRequest, NextResponse } from "next/server";
import { isInKenya } from "@/lib/kenya";
import { searchNearbyGyms } from "@/lib/osmPlaces";
import { PLACE_CACHE_HEADERS, rateLimit, readRadius } from "@/lib/requestSafety";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "places-nearby", 30, 60_000);
  if (limited) return limited;

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const radius = readRadius(request.nextUrl.searchParams.get("radius"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || radius == null) {
    return NextResponse.json(
      { error: "lat, lng, and a radius between 400 m and 40 km are required" },
      { status: 400 },
    );
  }

  const center = { lat, lng };
  if (!isInKenya(center)) {
    return NextResponse.json({ error: "Search is limited to Kenya" }, { status: 400 });
  }

  try {
    const gyms = await searchNearbyGyms(center, radius);
    if (gyms.length === 0) {
      return NextResponse.json({ gyms: [], empty: true }, { headers: PLACE_CACHE_HEADERS });
    }
    return NextResponse.json({ gyms }, { headers: PLACE_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Map lookup failed";
    return NextResponse.json(
      { gyms: [], empty: true, warning: message },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
