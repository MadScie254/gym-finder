import { useMemo } from "react";
import { Link } from "react-router";
import { useReport } from "../report/report-store";
import { useT, useVenueContext } from "../../app/venue-context";
import type { Venue } from "../../data/types";
import { formatDate, type CopyKey } from "../../lib/i18n";
import { areaPath } from "../../lib/places";
import { TrustBadge } from "../../ui";
import { placeOf } from "../results/ResultCard";
import styles from "./Home.module.css";

const LEAD = ["Nairobi", "Mombasa", "Kisumu", "Nakuru"];

function visible(venues: readonly Venue[]): Venue[] {
  return venues.filter((venue) => venue.trust.tier !== "unconfirmed");
}

/** Towns with at least three listed gyms, counted from the records people can see. A compact index, not cards. */
export function PlaceIndex() {
  const tr = useT();
  const { index } = useVenueContext();
  const towns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of visible(index?.venues ?? [])) {
      const town = venue.town ?? venue.county;
      if (town) counts.set(town, (counts.get(town) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= 3)
      .sort((a, b) => Number(LEAD.includes(b[0])) - Number(LEAD.includes(a[0])) || b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [index]);

  return (
    <section className={styles.section} aria-labelledby="home-places">
      <h2 id="home-places" className={styles.heading}>{tr("homePlaces")}</h2>
      <p className={styles.sectionLede}>{tr("homePlacesLede")}</p>
      {towns.length === 0 ? <p className={styles.note}>{tr("loadingGyms")}</p> : (
        <ul role="list" className={styles.places}>
          {towns.map(([name, n]) => (
            <li key={name}>
              <Link to={areaPath(name)} className={styles.place}>
                <span>{name}</span>
                <span className={styles.count}>{n}<span className="sr-only"> {tr("groupGyms").toLowerCase()}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ShortlistAndWeek() {
  const tr = useT();
  const blocks: { id: string; title: CopyKey; body: CopyKey; to: string; link: CopyKey }[] = [
    { id: "shortlist", title: "homeShortlistTitle", body: "homeShortlistBody", to: "/search", link: "homeFind" },
    { id: "week", title: "homeWeekTitle", body: "homeWeekBody", to: "/plan", link: "homeOpenWeek" },
  ];
  return (
    <div className={styles.pair}>
      {blocks.map((block) => (
        <section key={block.id} className={styles.editorial} aria-labelledby={`home-${block.id}`}>
          <h2 id={`home-${block.id}`} className={styles.heading}>{tr(block.title)}</h2>
          <p>{tr(block.body)}</p>
          <Link to={block.to}>{tr(block.link)}</Link>
        </section>
      ))}
    </div>
  );
}

/** The website-checked gyms. Never called "best" or "top rated": they are the ones with checked details. */
export function CheckedProfiles() {
  const tr = useT();
  const { index, lang } = useVenueContext();
  const checked = useMemo(() => (index?.venues ?? []).filter((venue) => venue.verification).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10), [index]);
  if (checked.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="home-checked">
      <h2 id="home-checked" className={styles.heading}>{tr("homeChecked")}</h2>
      <p className={styles.sectionLede}>{tr("homeCheckedLede")}</p>
      <ul role="list" className={styles.rows}>
        {checked.map((venue) => (
          <li key={venue.id}>
            <Link to={`/gym/${venue.slug}`} className={styles.row}>
              <span className={styles.rowName}>{venue.name}</span>
              <span className={styles.rowMeta}>{placeOf(venue, lang)}. {tr("homeCheckedOn", { date: formatDate(lang, venue.verification?.checkedAt) })}</span>
              <TrustBadge tier={venue.trust.tier} word={tr(`trust_${venue.trust.tier}`)} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FirstVisitGuide() {
  const tr = useT();
  const steps: CopyKey[] = ["askFees", "askHours", "askTrial", "askBring"];
  return (
    <section className={styles.section} aria-labelledby="home-guide">
      <h2 id="home-guide" className={styles.heading}>{tr("homeGuide")}</h2>
      <p className={styles.sectionLede}>{tr("homeGuideLede")}</p>
      <ul className={styles.guide}>{steps.map((key) => <li key={key}>{tr(key)}</li>)}</ul>
    </section>
  );
}

export function HomeFooter() {
  const tr = useT();
  const { index, lang } = useVenueContext();
  const report = useReport();
  return (
    <footer className={styles.footer}>
      <ul role="list" className={styles.footerLinks}>
        <li><Link to="/about/data">{tr("menuAbout")}</Link></li>
        <li><Link to="/legal">{tr("menuLegal")}</Link></li>
        <li><Link to="/reports">{tr("menuReports")}</Link></li>
        <li><button type="button" onClick={() => report.open("add_gym", null)}>{tr("menuAddGym")}</button></li>
      </ul>
      {index && <p className={styles.note}>{tr("homeDataLine", { date: formatDate(lang, index.manifest.builtAt) })}</p>}
    </footer>
  );
}
