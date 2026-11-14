import { useState } from "react";
import { Bookmark, BookmarkCheck, Columns3, Globe, MessageCircle, Navigation, Phone, Share2 } from "lucide-react";
import { useCompare, useSaved } from "../../app/stores";
import { useT } from "../../app/venue-context";
import type { LatLng, Venue } from "../../data/types";
import { directionsUrl, safeTelephoneUrl, safeWhatsAppUrl } from "../../lib/format";
import type { Translate } from "../../lib/i18n";
import { haversineKm } from "../../lib/kenya";
import { websiteHref } from "../../lib/report";
import { absoluteUrl, shareLink } from "../../lib/share";
import type { RowAction } from "../../ui/ActionRow";

/** "Westlands, Nairobi", or the translated "Area not listed". */
export function placeLine(venue: Venue, tr: Translate): string {
  const parts = [venue.area, venue.town ?? venue.county].filter((part): part is string => Boolean(part));
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.length ? unique.join(", ") : tr("areaNotListed");
}

export function kmFrom(reference: LatLng | null, venue: Venue): number | null {
  return reference ? haversineKm(reference, venue) : null;
}

export function whatsappHref(venue: Venue, tr: Translate): string | null {
  return safeWhatsAppUrl(venue.whatsapp, tr("whatsappMessage", { name: venue.name }));
}

/**
 * Save, compare and share for any gym, plus the action rows built from them.
 * `status` is a short sentence for a live region: "Link copied.", "You can compare 3 gyms...".
 */
export function useGymTools() {
  const tr = useT();
  const saved = useSaved();
  const compare = useCompare();
  const [status, setStatus] = useState("");

  function toggleCompare(venue: Venue) {
    setStatus(compare.toggle(venue.id) ? "" : tr("compareFull"));
  }

  async function share(venue: Venue) {
    const outcome = await shareLink({ title: venue.name, text: tr("whatsappMessage", { name: venue.name }), url: absoluteUrl(`/gym/${venue.slug}`) });
    setStatus(outcome === "copied" ? tr("shareCopied") : outcome === "failed" ? tr("shareFailed") : "");
  }

  function keepActions(venue: Venue): RowAction[] {
    const isSaved = saved.isSaved(venue.id);
    const inCompare = compare.has(venue.id);
    return [
      { id: "save", label: isSaved ? tr("actionSaved") : tr("actionSave"), icon: isSaved ? BookmarkCheck : Bookmark, pressed: isSaved, onClick: () => saved.toggle(venue) },
      { id: "compare", label: inCompare ? tr("actionCompared") : tr("actionCompare"), icon: Columns3, pressed: inCompare, onClick: () => toggleCompare(venue) },
    ];
  }

  /** On a card: the quickest way to reach the gym first, then save and compare. */
  function cardActions(venue: Venue): RowAction[] {
    const tel = safeTelephoneUrl(venue.phones[0]);
    const wa = whatsappHref(venue, tr);
    const reach: RowAction = tel
      ? { id: "call", label: tr("actionCall"), icon: Phone, href: tel }
      : { id: "directions", label: tr("actionDirections"), icon: Navigation, href: directionsUrl(venue.lat, venue.lng), external: true };
    return [reach, ...(wa ? [{ id: "wa", label: tr("actionWhatsApp"), icon: MessageCircle, href: wa, external: true }] : []), ...keepActions(venue)];
  }

  /** On the gym page, in the plan's order: Directions, Call, WhatsApp, Website, Share. */
  function detailActions(venue: Venue): RowAction[] {
    const tel = safeTelephoneUrl(venue.phones[0]);
    const wa = whatsappHref(venue, tr);
    const site = websiteHref(venue);
    return [
      { id: "directions", label: tr("actionDirections"), icon: Navigation, href: directionsUrl(venue.lat, venue.lng), external: true },
      ...(tel ? [{ id: "call", label: tr("actionCall"), icon: Phone, href: tel }] : []),
      ...(wa ? [{ id: "wa", label: tr("actionWhatsApp"), icon: MessageCircle, href: wa, external: true }] : []),
      ...(site ? [{ id: "web", label: tr("actionWebsite"), icon: Globe, href: site, external: true }] : []),
      { id: "share", label: tr("actionShare"), icon: Share2, onClick: () => { void share(venue); } },
    ];
  }

  return { status, setStatus, cardActions, detailActions, keepActions, toggleCompare };
}
