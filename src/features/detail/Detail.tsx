import { useState } from "react";
import { Bookmark, BookmarkCheck, ChevronLeft, Columns3, Flag, Globe2, MapPinned, MessageCircle, Phone, Share2, Store } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useCompareMaybe, useSavedMaybe } from "../../app/stores";
import type { LatLng, Venue } from "../../data/types";
import { directionsUrl, safeTelephoneUrl, safeWhatsAppUrl } from "../../lib/format";
import { parseHours } from "../../lib/hours";
import { t, type CopyKey, type Lang, type Vars } from "../../lib/i18n";
import { haversineKm } from "../../lib/kenya";
import { websiteHref } from "../../lib/report";
import { absoluteUrl, shareLink } from "../../lib/share";
import { ActionRow, Button, DistanceBlock, TrustBadge, type RowAction } from "../../ui";
import { useReportMaybe } from "../report/report-store";
import { kindLabel, placeOf } from "../results/ResultCard";
import { DetailFacts, Facilities } from "./DetailFacts";
import { DetailSources } from "./DetailSources";
import { FirstVisit } from "./FirstVisit";
import styles from "./Detail.module.css";

export type DetailProps = {
  venue: Venue;
  lang: Lang;
  /** A real reference point, or null. Distance is hidden without one. */
  origin: LatLng | null;
};

/**
 * The gym profile, in the owner's order: name and place, evidence, facilities, hours and price,
 * contact and visit, first-visit questions, then sources and corrections. Unknown is "Not listed".
 */
export function Detail({ venue, lang, origin }: DetailProps) {
  const tr = (key: CopyKey, vars?: Vars) => t(lang, key, vars);
  const saved = useSavedMaybe();
  const compare = useCompareMaybe();
  const report = useReportMaybe();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("");
  const km = origin ? haversineKm(origin, venue) : null;
  const hours = parseHours(venue.hours?.raw);
  const tel = safeTelephoneUrl(venue.phones[0] ?? null);
  const wa = safeWhatsAppUrl(venue.whatsapp, tr("whatsappMessage", { name: venue.name }));
  const site = websiteHref(venue);
  const tierWord = tr(`trust_${venue.trust.tier}`);

  async function share() {
    const outcome = await shareLink({ title: venue.name, url: absoluteUrl(`/gym/${venue.slug}`) });
    setStatus(outcome === "copied" ? tr("shareCopied") : outcome === "failed" ? tr("shareFailed") : "");
  }

  const actions: RowAction[] = [
    { id: "directions", label: tr("actionDirections"), icon: MapPinned, href: directionsUrl(venue.lat, venue.lng), external: true },
    ...(tel ? [{ id: "call", label: tr("actionCall"), icon: Phone, href: tel } satisfies RowAction] : []),
    ...(wa ? [{ id: "chat", label: tr("actionWhatsApp"), icon: MessageCircle, href: wa, external: true } satisfies RowAction] : []),
    ...(site ? [{ id: "website", label: tr("actionWebsite"), icon: Globe2, href: site, external: true } satisfies RowAction] : []),
    { id: "share", label: tr("actionShare"), icon: Share2, onClick: () => { void share(); } },
  ];
  const isSaved = saved?.isSaved(venue.id) ?? false;
  const inCompare = compare?.has(venue.id) ?? false;

  return (
    <article className={styles.detail} aria-labelledby="gym-name">
      <Link className={styles.back} to="/search" onClick={(event) => { if (location.key !== "default") { event.preventDefault(); navigate(-1); } }}>
        <ChevronLeft size={18} aria-hidden="true" /> {tr("detailBack")}
      </Link>
      <header className={styles.header}>
        <div>
          <h1 id="gym-name">{venue.name}</h1>
          <p className={styles.place}>{placeOf(venue, lang)}, {kindLabel(venue.kind, lang)}</p>
          <TrustBadge tier={venue.trust.tier} word={tierWord} />
        </div>
        {(km != null || hours.state === "open") && <DistanceBlock km={km} open={hours.state === "open"} size="detail" />}
      </header>

      <section className={styles.section} aria-labelledby="detail-trust">
        <h2 id="detail-trust">{tr("howWeKnow")}</h2>
        <p className={styles.summary}>{tr(`tierExplain_${venue.trust.tier}`)}</p>
        {venue.trust.reasons.length > 0 && <ul>{venue.trust.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      </section>

      <Facilities venue={venue} lang={lang} />
      <DetailFacts venue={venue} hours={hours} lang={lang} />

      <section className={styles.section} aria-labelledby="detail-contact">
        <h2 id="detail-contact">{tr("contactHeading")}</h2>
        <ActionRow actions={actions} label={tr("contactGroup", { name: venue.name })} />
        <p className={styles.note}>{tr("directionsNote")}</p>
        {!tel && !wa && !site && <p className={styles.note}>{tr("noContact")}</p>}
        {(saved || compare) && (
          <div className={styles.keep} role="group" aria-label={tr("manageGroup", { name: venue.name })}>
            {saved && <Button variant="secondary" icon={isSaved ? BookmarkCheck : Bookmark} aria-pressed={isSaved} onClick={() => saved.toggle(venue)}>{isSaved ? tr("actionSaved") : tr("actionSave")}</Button>}
            {compare && (
              <Button variant="quiet" icon={Columns3} aria-pressed={inCompare} onClick={() => setStatus(compare.toggle(venue.id) ? "" : tr("compareFull"))}>
                {inCompare ? tr("actionCompared") : tr("actionCompare")}
              </Button>
            )}
          </div>
        )}
        <p role="status" className={styles.note}>{status}</p>
      </section>

      <FirstVisit venue={venue} lang={lang} />
      <DetailSources venue={venue} lang={lang} />

      {report && (
        <div className={styles.fix}>
          <Button variant="quiet" icon={Flag} onClick={() => report.open("wrong_details", venue)}>{tr("somethingWrong")}</Button>
          <Button variant="quiet" icon={Store} onClick={() => report.open("claim", venue)}>{tr("claimGym")}</Button>
        </div>
      )}
    </article>
  );
}
