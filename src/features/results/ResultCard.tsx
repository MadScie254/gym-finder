import { Bookmark, BookmarkCheck, Columns3 } from "lucide-react";
import { Link } from "react-router";
import type { LatLng, Venue, VenueKind } from "../../data/types";
import { parseHours } from "../../lib/hours";
import { t, type Lang } from "../../lib/i18n";
import { haversineKm } from "../../lib/kenya";
import { Button, buttonClassName, GymCard } from "../../ui";
import styles from "./ResultCard.module.css";

export function kindLabel(kind: VenueKind, lang: Lang = "en"): string {
  return t(lang, `kind_${kind}`);
}

/** "Westlands, Nairobi", or "Area not listed". */
export function placeOf(venue: Venue, lang: Lang = "en"): string {
  const parts = [venue.area, venue.town ?? venue.county].filter((part): part is string => Boolean(part));
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.length ? unique.join(", ") : t(lang, "areaNotListed");
}

function money(amount: number): string {
  return `KES ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

/** The one most useful fact we really know, so cards differ by what matters. */
export function cardFact(venue: Venue, lang: Lang = "en"): string {
  if (venue.prices?.dayPass) return t(lang, "factDayPass", { amount: money(venue.prices.dayPass.amount) });
  if (venue.prices?.monthly) return t(lang, "factMonthly", { amount: money(venue.prices.monthly.amount) });
  if (venue.hours?.text || venue.hours?.raw) return t(lang, "factHours");
  if (venue.phones.length) return t(lang, "factPhone");
  if (venue.whatsapp) return t(lang, "factWhatsApp");
  if (venue.website) return t(lang, "factWebsite");
  return t(lang, "factNoContact");
}

export type ResultCardProps = {
  venue: Venue;
  /** A real reference point (device location or a named landmark), or null to hide distance. */
  origin: LatLng | null;
  selected: boolean;
  saved: boolean;
  onSave: () => void;
  compared: boolean;
  onCompare: () => void;
  /** Three other gyms are already in compare. */
  compareDisabled?: boolean;
  lang?: Lang;
};

/** A result: name, neighbourhood and activity, one known fact, then View gym, Save and a quiet Compare. */
export function ResultCard({ venue, origin, selected, saved, onSave, compared, onCompare, compareDisabled = false, lang = "en" }: ResultCardProps) {
  const km = origin ? haversineKm(origin, venue) : null;
  const href = `/gym/${venue.slug}`;
  return (
    <GymCard
      name={venue.name}
      href={href}
      place={placeOf(venue, lang)}
      kind={kindLabel(venue.kind, lang)}
      fact={cardFact(venue, lang)}
      tier={venue.trust.tier}
      tierWord={t(lang, `trust_${venue.trust.tier}`)}
      km={km}
      open={parseHours(venue.hours?.raw).state === "open"}
      selected={selected}
      level={2}
      renderLink={({ href: to, className, children }) => <Link to={to} className={className}>{children}</Link>}
      actions={(
        <div className={styles.actions} role="group" aria-label={t(lang, "manageGroup", { name: venue.name })}>
          <Link to={href} className={buttonClassName("primary", false, styles.view)} aria-label={t(lang, "viewGymNamed", { name: venue.name })}>
            {t(lang, "viewGym")}
          </Link>
          <Button variant="secondary" icon={saved ? BookmarkCheck : Bookmark} aria-pressed={saved} onClick={onSave}>
            {saved ? t(lang, "actionSaved") : t(lang, "actionSave")}
          </Button>
          <Button variant="quiet" icon={Columns3} aria-pressed={compared} disabled={compareDisabled && !compared} onClick={onCompare}
            title={compareDisabled && !compared ? t(lang, "compareFull") : undefined}>
            {compared ? t(lang, "actionCompared") : t(lang, "actionCompare")}
          </Button>
        </div>
      )}
    />
  );
}
