import { NextRequest, NextResponse } from "next/server";
import { DEMO_GYMS } from "@/lib/demoGyms";
import { getServerKey, searchTextGyms } from "@/lib/googlePlaces";
import { findCounty, isInKenya } from "@/lib/kenya";

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
  const textQuery = /gym|fitness|yoga/i.test(query)
    ? `${query} Kenya`
    : `gym in ${query}, Kenya`;

  if (!getServerKey()) {
    const needle = query.toLowerCase();
    const gyms = DEMO_GYMS.filter(
      (gym) =>
        gym.name.toLowerCase().includes(needle) ||
        gym.address.toLowerCase().includes(needle) ||
        (county && gym.address.toLowerCase().includes(county.name.toLowerCase())),
    );
    return NextResponse.json({ gyms: gyms.length ? gyms : DEMO_GYMS, demo: true });
  }

  try {
    const gyms = await searchTextGyms(textQuery, center ?? (county ? { lat: county.lat, lng: county.lng } : undefined));
    return NextResponse.json({ gyms, demo: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Places search failed";
    return NextResponse.json({ gyms: DEMO_GYMS, demo: true, warning: message });
  }
}
