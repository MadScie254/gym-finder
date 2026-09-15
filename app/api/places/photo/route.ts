import { NextRequest, NextResponse } from "next/server";
import { fetchPlacePhoto, getServerKey } from "@/lib/googlePlaces";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const maxHeightPx = Number(request.nextUrl.searchParams.get("maxHeightPx") ?? 800);

  if (!name || !name.startsWith("places/")) {
    return NextResponse.json({ error: "Valid photo name is required" }, { status: 400 });
  }

  if (!getServerKey()) {
    return NextResponse.json({ error: "Missing Google Maps server key" }, { status: 404 });
  }

  try {
    const googleResponse = await fetchPlacePhoto(name, maxHeightPx);
    if (!googleResponse.ok) {
      return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
    }

    const payload = (await googleResponse.json()) as { photoUri?: string };
    if (!payload.photoUri) {
      return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
    }

    return NextResponse.redirect(payload.photoUri, 302);
  } catch {
    return NextResponse.json({ error: "Photo lookup failed" }, { status: 502 });
  }
}
