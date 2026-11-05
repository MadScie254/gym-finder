import type { Venue } from "../data/types";
import { safeExternalUrl, safeWhatsAppUrl } from "./format";

const SUPPORT = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined;
const EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;

export function reportHref(venue: Venue | null, issue: string): string | null {
  const text = [
    `Find My Gym report: ${issue}`,
    venue ? `Venue: ${venue.name} (${venue.id})` : "Missing gym",
    venue ? `https://findmygym.ke/gym/${venue.slug}` : "",
  ].filter(Boolean).join("\n");
  if (SUPPORT) return safeWhatsAppUrl(`+${SUPPORT.replace(/\D/g, "")}`, text);
  if (EMAIL) return `mailto:${EMAIL}?subject=${encodeURIComponent("Find My Gym report")}&body=${encodeURIComponent(text)}`;
  return null;
}

export function osmEditUrl(venue: Venue): string {
  if (venue.osmUrl) {
    const match = /openstreetmap\.org\/(node|way|relation)\/(\d+)/.exec(venue.osmUrl);
    if (match) return `https://www.openstreetmap.org/edit?${match[1]}=${match[2]}`;
  }
  return `https://www.openstreetmap.org/edit#map=19/${venue.lat}/${venue.lng}`;
}

export function websiteHref(venue: Venue): string | null {
  return safeExternalUrl(venue.website);
}
