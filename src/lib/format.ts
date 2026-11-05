export function formatDistance(km: number | null): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function geoUrl(lat: number, lng: number): string {
  return `geo:${lat},${lng}`;
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeTelephoneUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/[\s().-]/g, "");
  return /^\+?[0-9]{6,20}$/.test(normalized) ? `tel:${normalized}` : null;
}

export function safeWhatsAppUrl(e164: string | null | undefined, text?: string): string | null {
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const url = new URL(`https://wa.me/${digits}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}

export function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km / 5) * 60));
}
