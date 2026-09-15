import { NextRequest, NextResponse } from "next/server";
import { DEMO_GYMS } from "@/lib/demoGyms";
import { haversineKm, isInKenya } from "@/lib/kenya";
import { searchNearbyGyms } from "@/lib/osmPlaces";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const radius = Number(request.nextUrl.searchParams.get("radius") ?? 5000);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const center = { lat, lng };
  if (!isInKenya(center)) {
    return NextResponse.json({ error: "Search is limited to Kenya" }, { status: 400 });
  }

  const nearbyDemo = DEMO_GYMS.filter(
    (gym) => haversineKm(center, gym.location) * 1000 <= Math.max(radius, 25000),
  );

  try {
    const gyms = await searchNearbyGyms(center, radius);
    if (gyms.length === 0) {
      return NextResponse.json({
        gyms: nearbyDemo,
        demo: nearbyDemo.length > 0,
        empty: nearbyDemo.length === 0,
      });
    }
    return NextResponse.json({ gyms, demo: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Map lookup failed";
    return NextResponse.json({
      gyms: nearbyDemo,
      demo: nearbyDemo.length > 0,
      empty: nearbyDemo.length === 0,
      warning: message,
    });
  }
}
