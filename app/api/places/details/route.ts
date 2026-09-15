import { NextRequest, NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/osmPlaces";
import { PLACE_CACHE_HEADERS, rateLimit } from "@/lib/requestSafety";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "places-details", 30, 60_000);
  if (limited) return limited;

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (!/^(node|way|relation)\/\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid gym id" }, { status: 400 });
  }

  try {
    const gym = await getPlaceDetails(id);
    if (!gym) {
      return NextResponse.json({ error: "Gym not found in Kenya" }, { status: 404 });
    }
    return NextResponse.json({ gym }, { headers: PLACE_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Details failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
