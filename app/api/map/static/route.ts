import { NextRequest } from "next/server";
import { isInKenya } from "@/lib/kenya";

const ESRI_EXPORT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const center = { lat, lng };

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInKenya(center)) {
    return new Response("Invalid map center", { status: 400 });
  }

  const span = 0.18;
  const bbox = [
    lng - span,
    lat - span * 0.64,
    lng + span,
    lat + span * 0.64,
  ].join(",");
  const params = new URLSearchParams({
    bbox,
    bboxSR: "4326",
    imageSR: "3857",
    size: "1600,1000",
    format: "jpg",
    transparent: "false",
    f: "image",
  });
  const upstream = await fetch(`${ESRI_EXPORT}?${params}`, {
    cache: "force-cache",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Map unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
