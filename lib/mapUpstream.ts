const PUBLIC_ESRI_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile";
const PUBLIC_ESRI_EXPORT_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export";

function configuredHttps(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value?.startsWith("https://")) return null;
  return value.replace(/\/$/, "");
}

/**
 * Production must set ESRI_TILE_URL. The public World Street Map is a local
 * development default only, matching Nominatim and Overpass.
 */
export function resolveEsriTileUrl(): string | null {
  const configured = configuredHttps("ESRI_TILE_URL");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return null;
  return PUBLIC_ESRI_TILE_URL;
}

/** Production must set ESRI_EXPORT_URL. See resolveEsriTileUrl. */
export function resolveEsriExportUrl(): string | null {
  const configured = configuredHttps("ESRI_EXPORT_URL");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return null;
  return PUBLIC_ESRI_EXPORT_URL;
}

export function imageContentType(header: string | null): string | null {
  const media = header?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (media === "image/jpeg" || media === "image/png" || media === "image/webp") return media;
  return null;
}
