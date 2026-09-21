import { isMapTileIndex, tileIntersectsKenya } from "@/lib/kenya";
import { imageContentType, resolveEsriTileUrl } from "@/lib/mapUpstream";
import { fetchWithTimeout, rateLimit } from "@/lib/requestSafety";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const limited = rateLimit(request, "map-tiles", 480, 60_000);
  if (limited) return limited;

  const tileUrl = resolveEsriTileUrl();
  if (!tileUrl) {
    return new Response("Basemap is unavailable until a production tile service is configured", {
      status: 503,
    });
  }

  const { z, x, y } = await params;
  const zoom = Number(z);
  const column = Number(x);
  const row = Number(y);

  if (!isMapTileIndex(zoom, column, row)) {
    return new Response("Invalid tile", { status: 400 });
  }
  if (!tileIntersectsKenya(zoom, column, row)) {
    return new Response("Tile outside Kenya", { status: 400 });
  }

  try {
    const upstream = await fetchWithTimeout(
      `${tileUrl}/${zoom}/${row}/${column}`,
      { cache: "force-cache" },
      10_000,
    );
    const contentType = imageContentType(upstream.headers.get("content-type"));

    if (!upstream.ok || !upstream.body || !contentType) {
      return new Response("Tile unavailable", { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Tile unavailable", { status: 502 });
  }
}
