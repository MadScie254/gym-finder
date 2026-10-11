import { isInKenya } from "@/lib/kenya";
import { rateLimit, fetchWithTimeout } from "@/lib/requestSafety";
import { withProviderThrottle } from "@/lib/ttlCache";
import { isLatLng, parseOsrmRoute } from "@/lib/routing";

export async function POST(request: Request) {
  const limited = rateLimit(request, "map-route", 12, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid route request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid route request" }, { status: 400 });
  }
  const { origin, destination } = body as Record<string, unknown>;
  if (!isLatLng(origin) || !isLatLng(destination) || !isInKenya(origin) || !isInKenya(destination)) {
    return Response.json({ error: "Route endpoints must be in Kenya" }, { status: 400 });
  }

  // The public OSRM server is for non-commercial development only. Production
  // requires a self-hosted or explicitly licensed service configured by its owner.
  const demo = !process.env.OSRM_DRIVING_URL && process.env.NODE_ENV === "development";
  const endpoint = process.env.OSRM_DRIVING_URL ||
    (process.env.NODE_ENV === "development" ? "https://router.project-osrm.org/route/v1/driving" : "");
  if (!endpoint) {
    return Response.json(
      { error: "In-app routing is not configured on this deployment yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  let url: URL;
  try {
    url = new URL(`${endpoint.replace(/\/$/, "")}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`);
    if (url.protocol !== "https:" && !(url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error();
  } catch {
    return Response.json({ error: "Routing service configuration is invalid." }, { status: 503 });
  }
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "true");
  url.searchParams.set("generate_hints", "false");

  try {
    const upstream = demo
      ? await withProviderThrottle("osrm-demo", 1_100, () => fetchWithTimeout(url, { cache: "no-store" }, 10_000))
      : await fetchWithTimeout(url, { cache: "no-store" }, 10_000);
    if (!upstream.ok) throw new Error("The routing service is unavailable.");
    const payload = await upstream.json();
    const route = parseOsrmRoute(payload);
    if (!route) {
      return Response.json({ error: "No road route was found between these points." },
        { status: 422, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ route }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not calculate a route right now. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
