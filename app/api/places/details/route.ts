import { NextRequest, NextResponse } from "next/server";
import { DEMO_GYMS } from "@/lib/demoGyms";
import { getPlaceDetails } from "@/lib/osmPlaces";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const demoGym = DEMO_GYMS.find((gym) => gym.id === id);
  if (demoGym) {
    return NextResponse.json({ gym: demoGym, demo: true });
  }

  try {
    const gym = await getPlaceDetails(id);
    if (!gym) {
      return NextResponse.json({ error: "Gym not found in Kenya" }, { status: 404 });
    }
    return NextResponse.json({ gym });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Details failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
