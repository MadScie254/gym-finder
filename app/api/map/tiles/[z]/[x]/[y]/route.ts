import { fetchWithTimeout, rateLimit } from "@/lib/requestSafety";

const ESRI_TILE =
  process.env.ESRI_TILE_URL ??
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const limited = rateLimit(request, "map-tiles", 480, 60_000);
  if (limited) return limited;

  const { z, x, y } = await params;
  const zoom = Number(z);
  const column = Number(x);
  const row = Number(y);

  if (
    !Number.isInteger(zoom) ||
    !Number.isInteger(column) ||
    !Number.isInteger(row) ||
    zoom < 0 ||
    zoom > 19 ||
    column < 0 ||
    row < 0 ||
    column >= 2 ** zoom ||
    row >= 2 ** zoom
  ) {
    return new Response("Invalid tile", { status: 400 });
  }

  try {
    const upstream = await fetchWithTimeout(`${ESRI_TILE}/${zoom}/${row}/${column}`, {
      cache: "force-cache",
    }, 10_000);

    if (!upstream.ok || !upstream.body) {
      return new Response("Tile unavailable", { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Tile unavailable", { status: 502 });
  }
}
