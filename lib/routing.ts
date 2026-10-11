import type { LatLng } from "./types";

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
};

export type GymRoute = {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
};

type OsrmStep = {
  distance?: unknown;
  name?: unknown;
  maneuver?: { type?: unknown; modifier?: unknown; exit?: unknown };
};

function instructionFor(step: OsrmStep): string {
  const maneuver = step.maneuver ?? {};
  const type = typeof maneuver.type === "string" ? maneuver.type : "continue";
  const modifier = typeof maneuver.modifier === "string" ? maneuver.modifier.replaceAll("_", " ") : "";
  const name = typeof step.name === "string" ? step.name.trim().slice(0, 100) : "";
  const road = name ? ` onto ${name}` : "";
  if (type === "depart") return name ? `Start on ${name}` : "Start";
  if (type === "arrive") return "Arrive at the gym";
  if (type === "roundabout" || type === "rotary") {
    const exit = Number(maneuver.exit);
    return Number.isInteger(exit) && exit > 0 && exit <= 20
      ? `At the roundabout, take exit ${exit}${road}`
      : `Enter the roundabout${road}`;
  }
  if (type === "turn" || type === "fork" || type === "end of road") {
    return `${type === "fork" ? "Keep" : "Turn"} ${modifier || "ahead"}${road}`;
  }
  if (type === "merge") return `Merge ${modifier || "ahead"}${road}`;
  if (type === "on ramp" || type === "off ramp") return `Take the ramp ${modifier}${road}`.trim();
  return `Continue${road}`;
}

/** Accept only a bounded, well-formed route from the configured routing service. */
export function parseOsrmRoute(value: unknown): GymRoute | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as { code?: unknown; routes?: unknown };
  if (payload.code !== "Ok" || !Array.isArray(payload.routes)) return null;
  const route = payload.routes[0] as {
    distance?: unknown;
    duration?: unknown;
    geometry?: { coordinates?: unknown };
    legs?: { steps?: unknown }[];
  } | undefined;
  if (!route || typeof route.distance !== "number" || typeof route.duration !== "number" ||
      !Number.isFinite(route.distance) || !Number.isFinite(route.duration) ||
      route.distance < 0 || route.duration < 0) return null;
  const raw = route.geometry?.coordinates;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 30_000) return null;
  const coordinates: [number, number][] = [];
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        typeof pair[0] !== "number" || typeof pair[1] !== "number" ||
        !Number.isFinite(pair[0]) || !Number.isFinite(pair[1]) ||
        pair[0] < -180 || pair[0] > 180 || pair[1] < -90 || pair[1] > 90) return null;
    coordinates.push([pair[0], pair[1]]);
  }
  const steps = (route.legs ?? []).flatMap((leg) => Array.isArray(leg.steps) ? leg.steps : [])
    .slice(0, 300)
    .map((step: OsrmStep) => ({
      instruction: instructionFor(step),
      distanceMeters: typeof step.distance === "number" && Number.isFinite(step.distance)
        ? Math.max(0, step.distance) : 0,
    }));
  return { coordinates, distanceMeters: route.distance, durationSeconds: route.duration, steps };
}

export function isLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<LatLng>;
  return typeof point.lat === "number" && typeof point.lng === "number" &&
    Number.isFinite(point.lat) && Number.isFinite(point.lng) &&
    point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180;
}
