import { Bookmark, GitCompareArrows, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router";
import type { LatLng, Venue, VenueKind } from "../../data/types";
import { safeTelephoneUrl, safeWhatsAppUrl } from "../../lib/format";
import { parseHours } from "../../lib/hours";
import { haversineKm } from "../../lib/kenya";
import { ActionRow, GymCard, type RowAction } from "../../ui";

const KIND: Record<VenueKind, string> = {
  gym: "Gym", crossfit: "CrossFit", yoga: "Yoga", pilates: "Pilates",
  martial_arts: "Martial arts", boxing: "Boxing", gymnastics: "Gymnastics", boot_camp: "Boot camp",
};

export function kindLabel(kind: VenueKind): string { return KIND[kind]; }

export function ResultCard({
  venue, origin, selected, saved, onSave, compared, onCompare, compareDisabled = false,
}: {
  venue: Venue;
  origin: LatLng | null;
  selected: boolean;
  saved: boolean;
  onSave: () => void;
  compared: boolean;
  onCompare: () => void;
  compareDisabled?: boolean;
}) {
  const km = origin ? haversineKm(origin, { lat: venue.lat, lng: venue.lng }) : null;
  const tel = safeTelephoneUrl(venue.phones[0] ?? null);
  const wa = safeWhatsAppUrl(venue.whatsapp, `Hi, is ${venue.name} open today and what is the day-pass price? Found you on Find My Gym.`);
  const place = [venue.area ?? venue.town, venue.county].filter(Boolean).join(", ");
  const actions: RowAction[] = [
    ...(tel ? [{ id: "call", label: "Call", icon: Phone, href: tel } satisfies RowAction] : []),
    ...(wa ? [{ id: "chat", label: "Chat", icon: MessageCircle, href: wa, external: true } satisfies RowAction] : []),
    { id: "save", label: saved ? "Saved" : "Save", icon: Bookmark, onClick: onSave, pressed: saved },
    { id: "compare", label: compared ? "Added" : "Compare", icon: GitCompareArrows, onClick: onCompare, pressed: compared, disabled: compareDisabled && !compared },
  ];
  return (
    <GymCard
      name={venue.name}
      href={`/gym/${venue.slug}`}
      place={place || null}
      kind={kindLabel(venue.kind)}
      tier={venue.trust.tier}
      km={km}
      open={venue.hours?.raw ? parseHours(venue.hours.raw).state === "open" : false}
      selected={selected}
      level={2}
      renderLink={({ href, className, children }) => <Link to={href} className={className}>{children}</Link>}
      actions={<ActionRow label={`Actions for ${venue.name}`} actions={actions} />}
    />
  );
}
