import { NextRequest, NextResponse } from "next/server";
import { findCounty, isInKenya } from "@/lib/kenya";
import { searchNearbyGyms, searchTextGyms } from "@/lib/osmPlaces";
import { PLACE_CACHE_HEADERS, rateLimit, readBoundedQuery } from "@/lib/requestSafety";

export async function GET(request: NextRequest) {
  const queryResult = readBoundedQuery(request.nextUrl.searchParams.get("q"));
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const center =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

  if ("error" in queryResult) {
    return NextResponse.json({ error: queryResult.error }, { status: 400 });
  }
  const query = queryResult.query;

  const limited = rateLimit(request, "places-search", 12, 60_000);
  if (limited) return limited;

  if (center && !isInKenya(center)) {
    return NextResponse.json({ error: "Search is limited to Kenya" }, { status: 400 });
  }

  const county = findCounty(query);
  try {
    if (county) {
      const gyms = await searchNearbyGyms({ lat: county.lat, lng: county.lng }, 15000);
      return NextResponse.json({
        gyms,
        empty: gyms.length === 0,
        place: { name: county.name, kind: "county", location: { lat: county.lat, lng: county.lng } },
      }, { headers: PLACE_CACHE_HEADERS });
    }
    const gyms = await searchTextGyms(query, center);
    return NextResponse.json({ gyms, empty: gyms.length === 0 }, { headers: PLACE_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json(
      { gyms: [], empty: true, warning: message },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
