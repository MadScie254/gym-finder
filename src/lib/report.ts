import type { Venue } from "../data/types";
import type { IssueKind, Submission } from "./backend";
import { safeExternalUrl, safeWhatsAppUrl } from "./format";

/** Set in Vercel (plan D4). Never committed. Unset locally, and the flow says so. */
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined;

/** Read by the owner, so always English whatever language the visitor uses. */
const ISSUE_TITLE: Record<IssueKind, string> = {
  wrong_details: "Wrong details",
  closed: "Closed for good",
  duplicate: "Listed twice",
  add_gym: "Missing gym",
  claim: "Claim: I run this gym",
  other: "Other",
};

export function supportNumber(raw: string | undefined = SUPPORT_WHATSAPP): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

/** The message the support WhatsApp receives. Links use the host that serves the app, never an invented domain. */
export function reportMessage(row: Pick<Submission, "kind" | "venueId" | "venueName" | "message" | "place" | "contact" | "id">, venue: Venue | null, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  return [
    `Find My Gym: ${ISSUE_TITLE[row.kind]}`,
    `Gym: ${row.venueName}${row.venueId ? ` (${row.venueId})` : ""}`,
    row.place ? `Where: ${row.place}` : "",
    venue && origin ? `${origin}/gym/${venue.slug}` : "",
    row.message ? `Note: ${row.message}` : "",
    row.contact ? `Reply to: ${row.contact}` : "",
    `Ref: ${row.id}`,
  ].filter(Boolean).join("\n");
}

/** A wa.me link to the support number, or null when this build has no number. Never a dead link. */
export function supportWhatsAppHref(text: string, raw: string | undefined = SUPPORT_WHATSAPP): string | null {
  const number = supportNumber(raw);
  return number ? safeWhatsAppUrl(`+${number}`, text) : null;
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
