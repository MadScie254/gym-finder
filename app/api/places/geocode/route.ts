import { NextRequest, NextResponse } from "next/server";
import { findCounty } from "@/lib/kenya";
import { geocodeKenyaPlaces, type PlaceHit } from "@/lib/osmPlaces";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const county = findCounty(query);
  const countyHit: PlaceHit | null = county
    ? {
        id: `county/${county.name}`,
        name: county.name,
        subtitle: "County · Kenya",
        kind: "county",
        location: { lat: county.lat, lng: county.lng },
      }
    : null;

  try {
    const places = await geocodeKenyaPlaces(query, 8);
    const merged: PlaceHit[] = [];
    const seen = new Set<string>();

    if (countyHit) {
      merged.push(countyHit);
      seen.add(countyHit.name.toLowerCase());
    }

    for (const place of places) {
      const key = place.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(place);
    }

    return NextResponse.json({ places: merged });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Geocode failed";
    return NextResponse.json({
      places: countyHit ? [countyHit] : [],
      warning: message,
    });
  }
}
