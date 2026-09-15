import { NextRequest, NextResponse } from "next/server";
import { DEMO_GYMS } from "@/lib/demoGyms";
import { getPlaceDetails, getServerKey } from "@/lib/googlePlaces";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const demoGym = DEMO_GYMS.find((gym) => gym.id === id);
  if (demoGym) {
    return NextResponse.json({ gym: demoGym, demo: true });
  }

  if (!getServerKey()) {
    return NextResponse.json({ error: "Missing Google Maps server key" }, { status: 404 });
  }

  try {
    const gym = await getPlaceDetails(id);
    if (!gym) {
      return NextResponse.json({ error: "Gym not found in Kenya" }, { status: 404 });
    }
    return NextResponse.json({ gym });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Place details failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
