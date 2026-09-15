import { NextRequest, NextResponse } from "next/server";
import { DEMO_GYMS } from "@/lib/demoGyms";
import { findCounty, isInKenya } from "@/lib/kenya";
import { searchNearbyGyms, searchTextGyms } from "@/lib/osmPlaces";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const center =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  if (center && !isInKenya(center)) {
    return NextResponse.json({ error: "Search is limited to Kenya" }, { status: 400 });
  }

  const county = findCounty(query);
  const needle = query.toLowerCase();
  const demoMatches = DEMO_GYMS.filter(
    (gym) =>
      gym.name.toLowerCase().includes(needle) ||
      gym.address.toLowerCase().includes(needle) ||
      (county && gym.address.toLowerCase().includes(county.name.toLowerCase())),
  );
  const demoGyms = demoMatches.length ? demoMatches : DEMO_GYMS;

  try {
    if (county) {
      const gyms = await searchNearbyGyms({ lat: county.lat, lng: county.lng }, 15000);
      return NextResponse.json({
        gyms: gyms.length ? gyms : demoGyms,
        demo: gyms.length === 0,
        place: { name: county.name, kind: "county", location: { lat: county.lat, lng: county.lng } },
      });
    }
    const gyms = await searchTextGyms(query, center);
    return NextResponse.json({ gyms: gyms.length ? gyms : demoGyms, demo: gyms.length === 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ gyms: demoGyms, demo: true, warning: message });
  }
}
