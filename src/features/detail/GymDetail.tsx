import { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ChevronLeft, Flag, SearchX, Store } from "lucide-react";
import { useExplore } from "../../app/explore-context";
import { useT, useVenueContext } from "../../app/venue-context";
import { parseHours } from "../../lib/hours";
import { ActionRow } from "../../ui/ActionRow";
import { Button } from "../../ui/Button";
import { DistanceBlock } from "../../ui/DistanceBlock";
import { EmptyState } from "../../ui/EmptyState";
import { SkeletonList } from "../../ui/Skeleton";
import { TrustBadge } from "../../ui/TrustBadge";
import { kindLabelKey } from "../explore/chipCount";
import { kmFrom, placeLine, useGymTools } from "../gym/gymTools";
import { useReport } from "../report/report-store";
import { DetailFacts } from "./DetailFacts";
import { DetailSources } from "./DetailSources";
import styles from "./GymDetail.module.css";

/** The gym page, as a panel beside the map (plan G4). Never a modal. */
export function GymDetail() {
  const tr = useT();
  const { slug = "" } = useParams();
  const { index, origin } = useVenueContext();
  const { setSelected, flyTo, pins, setPins } = useExplore();
  const report = useReport();
  const tools = useGymTools();
  const navigate = useNavigate();
  const location = useLocation();
  const venue = index?.bySlug.get(slug.replace(/\/$/, "")) ?? null;

  useEffect(() => {
    setSelected(venue);
    if (venue) flyTo(venue, 15);
  }, [venue, setSelected, flyTo]);
  // Opened from a link: show the other gyms around it too.
  useEffect(() => {
    if (index && pins.length === 0) setPins(index.venues.filter((item) => item.trust.tier !== "unconfirmed"));
  }, [index, pins.length, setPins]);
  useEffect(() => { if (venue) document.title = `${venue.name}, ${placeLine(venue, tr)}. ${tr("brand")}`; }, [venue, tr]);

  if (!index) return <SkeletonList count={1} label={tr("loadingGyms")} />;
  if (!venue) {
    return (
      <EmptyState icon={SearchX} title={tr("detailNotFoundTitle")} action={<Link to="/">{tr("goHome")}</Link>}>
        {tr("detailNotFoundBody")}
      </EmptyState>
    );
  }

  const hours = parseHours(venue.hours?.raw);
  const actions = tools.detailActions(venue);
  const hasContact = actions.some((action) => action.id === "call" || action.id === "wa" || action.id === "web");

  return (
    <article className={styles.detail} aria-labelledby="gym-name">
      <Link to="/" className={styles.back} onClick={(event) => { if (location.key !== "default") { event.preventDefault(); navigate(-1); } }}>
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={2.25} />
        {tr("detailBack")}
      </Link>
      <header className={styles.head}>
        <DistanceBlock km={kmFrom(origin, venue)} open={hours.state === "open"} size="detail" />
        <div className={styles.names}>
          <h1 id="gym-name" className={styles.name}>{venue.name}</h1>
          <p className={styles.place}>{placeLine(venue, tr)}, {tr(kindLabelKey(venue.kind))}</p>
          <TrustBadge tier={venue.trust.tier} />
        </div>
      </header>
      <ActionRow actions={actions} label={tr("contactGroup", { name: venue.name })} />
      <div className={styles.keep} role="group" aria-label={tr("manageGroup", { name: venue.name })}>
        {tools.keepActions(venue).map((action) => (
          <Button key={action.id} variant="secondary" icon={action.icon} aria-pressed={action.pressed} onClick={action.onClick}>{action.label}</Button>
        ))}
      </div>
      <p className="sr-only" role="status">{tools.status}</p>
      {tools.status && <p className={styles.toast} aria-hidden="true">{tools.status}</p>}
      {!hasContact && <p className={styles.notice}>{tr("noContact")}</p>}
      <DetailFacts venue={venue} hours={hours} />
      <section className={styles.section} aria-labelledby="gym-trust">
        <h2 id="gym-trust" className={styles.heading}>{tr("detailTrustHeading", { tier: tr(`trust_${venue.trust.tier}` as const) })}</h2>
        <ul className={styles.reasons}>
          {venue.trust.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </section>
      <DetailSources venue={venue} />
      <div className={styles.fix}>
        <Button variant="quiet" icon={Flag} onClick={() => report.open("wrong_details", venue)}>{tr("somethingWrong")}</Button>
        <Button variant="quiet" icon={Store} onClick={() => report.open("claim", venue)}>{tr("claimGym")}</Button>
      </div>
    </article>
  );
}
