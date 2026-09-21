import { NextRequest } from "next/server";
import { isInKenya } from "@/lib/kenya";
import { imageContentType, resolveEsriExportUrl } from "@/lib/mapUpstream";
import { fetchWithTimeout, rateLimit } from "@/lib/requestSafety";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "map-static", 24, 60_000);
  if (limited) return limited;

  const exportUrl = resolveEsriExportUrl();
  if (!exportUrl) {
    return new Response("Basemap is unavailable until a production map service is configured", {
      status: 503,
    });
  }

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const center = { lat, lng };

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInKenya(center)) {
    return new Response("Invalid map center", { status: 400 });
  }

  const span = 0.18;
  const bbox = [lng - span, lat - span * 0.64, lng + span, lat + span * 0.64].join(",");
  const params = new URLSearchParams({
    bbox,
    bboxSR: "4326",
    imageSR: "3857",
    size: "1600,1000",
    format: "jpg",
    transparent: "false",
    f: "image",
  });
  try {
    const upstream = await fetchWithTimeout(`${exportUrl}?${params}`, { cache: "force-cache" }, 10_000);
    const contentType = imageContentType(upstream.headers.get("content-type"));

    if (!upstream.ok || !upstream.body || !contentType) {
      return new Response("Map unavailable", { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("Map unavailable", { status: 502 });
  }
}
