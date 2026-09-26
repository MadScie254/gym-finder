import { NextRequest, NextResponse } from "next/server";
import { findCounty } from "@/lib/kenya";
import { findLocalPlace } from "@/lib/kenyaPlaces";
import { searchNearbyGyms, searchTextGyms } from "@/lib/osmPlaces";
import { PLACE_CACHE_HEADERS, rateLimit, readBoundedQuery } from "@/lib/requestSafety";

export async function GET(request: NextRequest) {
  const queryResult = readBoundedQuery(request.nextUrl.searchParams.get("q"));

  if ("error" in queryResult) {
    return NextResponse.json({ error: queryResult.error }, { status: 400 });
  }
  const query = queryResult.query;

  const limited = rateLimit(request, "places-search", 12, 60_000);
  if (limited) return limited;

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
    const place = findLocalPlace(query);
    if (place) {
      const gyms = await searchNearbyGyms(place.location, place.kind === "county" ? 15000 : place.kind === "town" ? 12000 : 8000);
      return NextResponse.json({ gyms, empty: gyms.length === 0, place }, { headers: PLACE_CACHE_HEADERS });
    }
    const gyms = await searchTextGyms(query);
    return NextResponse.json({ gyms, empty: gyms.length === 0 }, { headers: PLACE_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json(
      { gyms: [], empty: true, warning: message },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
