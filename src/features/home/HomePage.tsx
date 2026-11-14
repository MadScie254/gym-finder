import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { LocateFixed } from "lucide-react";
import { useSaved } from "../../app/stores";
import { useT, useVenueContext } from "../../app/venue-context";
import { hasPlanSettings } from "../../lib/storage";
import { Button, buttonClassName } from "../../ui";
import { GymSearch } from "../search/GymSearch";
import { CheckedProfiles, FirstVisitGuide, HomeFooter, PlaceIndex, ShortlistAndWeek } from "./HomeSections";
import styles from "./Home.module.css";

/** `/`: a real homepage, not the map. Search and location sit in the first phone screen. */
export function HomePage() {
  const tr = useT();
  const { index, locate, origin } = useVenueContext();
  const saved = useSaved();
  const navigate = useNavigate();
  const waitingForLocation = useRef(false);
  const planned = useMemo(() => hasPlanSettings(), []);
  const returning = saved.entries.length > 0 || planned;

  // "Use my location" goes to the list once the browser answers with a real position.
  useEffect(() => {
    if (waitingForLocation.current && origin) { waitingForLocation.current = false; navigate("/search"); }
  }, [origin, navigate]);

  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <h1 id="home-title" className={styles.headline}>{tr("homeHeadline")}</h1>
        <p className={styles.lede}>{tr("homeLede")}</p>
        <div className={styles.searchRow}>
          <GymSearch label={tr("homeSearchLabel")} placeholder={tr("homeSearchPlaceholder")} />
        </div>
        <div className={styles.heroActions}>
          <Link to="/search" className={buttonClassName("primary")}>{tr("homeFind")}</Link>
          <Button variant="secondary" icon={LocateFixed} onClick={() => { waitingForLocation.current = true; locate(); }}>{tr("locate")}</Button>
        </div>
        <p className={styles.note}>{tr("homeNote")}</p>
      </section>

      {returning && (
        <section className={styles.section} aria-labelledby="home-continue">
          <h2 id="home-continue" className={styles.heading}>{tr("homeContinue")}</h2>
          <ul role="list" className={styles.rows}>
            {saved.entries.slice(0, 3).map((entry) => {
              const venue = index?.byId.get(entry.id) ?? entry.snapshot;
              return (
                <li key={entry.id}>
                  <Link to={`/gym/${venue.slug}`} className={styles.row}>
                    <span className={styles.rowName}>{venue.name}</span>
                    <span className={styles.rowMeta}>{[venue.area, venue.town ?? venue.county].filter(Boolean).join(", ")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className={styles.links}>
            {saved.entries.length > 0 && <Link to="/saved">{tr("homeAllSaved", { n: saved.entries.length })}</Link>}
            {planned && <Link to="/plan">{tr("homeContinueWeek")}</Link>}
          </p>
        </section>
      )}

      <PlaceIndex />
      <ShortlistAndWeek />
      <CheckedProfiles />
      {!returning && <FirstVisitGuide />}
      <HomeFooter />
    </div>
  );
}
