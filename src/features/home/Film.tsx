import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  CalendarDays, Clock, MapPin, Navigation, Phone, Search, ShieldCheck, Tag, UtensilsCrossed, type LucideProps,
} from "lucide-react";
import { useT, useVenueContext } from "../../app/venue-context";
import type { PhotoId } from "../../assets/photos";
import type { TrustTier } from "../../data/types";
import type { CopyKey } from "../../lib/i18n";
import { Photo, TrustBadge } from "../../ui";
import styles from "./Film.module.css";

type Icon = ComponentType<LucideProps>;
type SceneId = "find" | "check" | "known" | "plan" | "eat";

/** The five scenes of the home film. Each one adds pieces to the gym profile ("the dossier") on the board. */
const SCENES: { id: SceneId; icon: Icon; photo: PhotoId; title: CopyKey; body: CopyKey; count: CopyKey }[] = [
  { id: "find", icon: Search, photo: "dumbbells", title: "filmFindTitle", body: "filmFindBody", count: "filmFindCount" },
  { id: "check", icon: ShieldCheck, photo: "boxing-room", title: "filmCheckTitle", body: "filmCheckBody", count: "filmCheckCount" },
  { id: "known", icon: Clock, photo: "functional-floor", title: "filmKnownTitle", body: "filmKnownBody", count: "filmKnownCount" },
  { id: "plan", icon: CalendarDays, photo: "treadmills", title: "filmPlanTitle", body: "filmPlanBody", count: "filmPlanCount" },
  { id: "eat", icon: UtensilsCrossed, photo: "ugali-plates", title: "filmEatTitle", body: "filmEatBody", count: "filmEatCount" },
];

/** The six pieces of a profile, in the order the film adds them, and the scene that adds each. */
const PIECES: { icon: Icon; label: CopyKey; scene: number }[] = [
  { icon: MapPin, label: "filmRowName", scene: 0 },
  { icon: Navigation, label: "filmRowDistance", scene: 0 },
  { icon: ShieldCheck, label: "filmRowEvidence", scene: 1 },
  { icon: Clock, label: "filmRowHours", scene: 2 },
  { icon: Phone, label: "filmRowContact", scene: 2 },
  { icon: Tag, label: "filmRowPrice", scene: 2 },
];

const TIERS: TrustTier[] = ["verified", "corroborated", "listed"];
const TRAINING_DAYS = new Set([0, 2, 4]);

type Facts = { gyms: number; counties: number; checked: number; tiers: Record<TrustTier, number>; hours: number; contact: number; price: number };

/** Every number in the film is counted from the catalogue the app loaded; nothing here is typed in by hand. */
function useFacts(): Facts | null {
  const { index } = useVenueContext();
  return useMemo(() => {
    if (!index) return null;
    const visible = index.venues.filter((venue) => venue.trust.tier !== "unconfirmed");
    const tiers: Record<TrustTier, number> = { verified: 0, corroborated: 0, listed: 0, unconfirmed: 0 };
    const counties = new Set<string>();
    let hours = 0, contact = 0, price = 0;
    for (const venue of visible) {
      tiers[venue.trust.tier] += 1;
      if (venue.county) counties.add(venue.county);
      if (venue.hours) hours += 1;
      if (venue.phones.length > 0 || venue.whatsapp || venue.website) contact += 1;
      if (venue.prices && Object.keys(venue.prices).length > 0) price += 1;
    }
    return { gyms: visible.length, counties: counties.size, checked: tiers.verified + tiers.corroborated, tiers, hours, contact, price };
  }, [index]);
}

function sceneNumber(facts: Facts | null, scene: number): number | null {
  if (scene === 3) return 7;
  if (scene === 4) return 0;
  if (!facts) return null;
  return [facts.gyms, facts.checked, facts.contact][scene] ?? null;
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Counts from the last value to the next, on the compositor-free text node only. Instant with reduced motion. */
function Counter({ value }: { value: number | null }) {
  const [shown, setShown] = useState<number | null>(value);
  const from = useRef<number>(value ?? 0);
  useEffect(() => {
    if (value == null) return;
    if (reducedMotion()) { from.current = value; setShown(value); return; }
    const start = performance.now(), a = from.current, span = 720;
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / span);
      const eased = 1 - (1 - k) ** 3;
      setShown(Math.round(a + (value - a) * eased));
      if (k < 1) frame = requestAnimationFrame(step); else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); from.current = value; };
  }, [value]);
  return <span className={styles.counterValue}>{shown ?? "–"}</span>;
}

function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") return el;
  }
  return null;
}

/**
 * Which scene is on stage. Step markers scroll past a line across the middle of the scroller; an
 * IntersectionObserver reports which one is on it. Without IntersectionObserver the film shows as a plain
 * sequence of scenes (the same layout as reduced motion).
 */
function useScene(film: React.RefObject<HTMLElement | null>): { scene: number; reach: number; fallback: boolean } {
  const [scene, setScene] = useState(0);
  // How far the film has got: -1 until it comes near the screen, so its pictures do not compete with the hero's.
  const [reach, setReach] = useState(-1);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const node = film.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") { setFallback(true); return; }
    const root = scrollParent(node);
    // The stage is as tall as what is left of the scroller once a bottom tab bar has taken its strip.
    const measure = () => {
      const bar = document.querySelector<HTMLElement>("[data-bottom-bar]");
      const covered = bar && !root ? bar.getBoundingClientRect().height : 0;
      node.style.setProperty("--film-h", `${(root ? root.clientHeight : window.innerHeight) - covered}px`);
    };
    measure();
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(root ?? document.documentElement);
    const markers = [...node.querySelectorAll<HTMLElement>("[data-step]")];
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const step = Number((entry.target as HTMLElement).dataset.step);
        setScene(step);
        setReach((r) => Math.max(r, step));
      }
    }, { root, rootMargin: "-50% 0px -50% 0px", threshold: 0 });
    markers.forEach((marker) => io.observe(marker));
    const near = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setReach((r) => Math.max(r, 0)); near.disconnect(); }
    }, { root, rootMargin: "0px 0px 50% 0px" });
    near.observe(node);
    return () => { io.disconnect(); near.disconnect(); resize?.disconnect(); };
  }, [film]);
  return { scene, reach, fallback };
}

/**
 * The home film, "the dossier": a pinned stage while the page scrolls through five scenes. The picture changes, the
 * headline changes with it, a number plate counts the catalogue, and the profile on the board assembles piece by
 * piece, each piece an icon that drops into the strip along its top. The rail down the left is the page's thread.
 */
export function Film() {
  const tr = useT();
  const facts = useFacts();
  const ref = useRef<HTMLElement>(null);
  const { scene, reach, fallback } = useScene(ref);
  const days = tr("filmDays").split(" ");
  const fmt = (n: number | undefined) => (n == null ? "–" : String(n));

  return (
    <section
      ref={ref}
      className={styles.film}
      data-scene={scene}
      data-static={fallback || undefined}
      style={{ "--scene": scene } as React.CSSProperties}
      aria-labelledby="film-title"
    >
      <h2 id="film-title" className="sr-only">{tr("filmLabel")}</h2>
      <div className={styles.pin}>
        <ol role="list" className={styles.rail} aria-hidden="true">
          {SCENES.map((s, i) => (
            <li key={s.id} className={styles.stop} data-state={i < scene ? "past" : i === scene ? "now" : "next"}>
              <span className={styles.disc}><s.icon size={18} strokeWidth={1.75} /></span>
              <span className={styles.stopWord}>{tr(`filmStep_${s.id}` as CopyKey)}</span>
            </li>
          ))}
          <li className={styles.railFill} />
        </ol>

        <div className={styles.frame}>
          {SCENES.map((s, i) => (
            <figure key={s.id} className={styles.shot} data-on={i === scene || undefined}>
              {i <= reach + 1 && reach >= 0 && (
                <Photo id={s.photo} sizes="(min-width: 1100px) 520px, (min-width: 760px) 45vw, 100vw" className={styles.shotImg} />
              )}
            </figure>
          ))}
          <p className={styles.photoNote}>{tr("filmPhotoNote")}</p>
        </div>

        <div className={styles.board}>
          <div className={styles.dossier} aria-hidden="true">
            {PIECES.map((piece) => (
              <span key={piece.label} className={styles.slot} data-filled={piece.scene <= scene || undefined}>
                <piece.icon size={16} strokeWidth={1.75} />
              </span>
            ))}
          </div>

          <p className={styles.counter} aria-hidden="true">
            <Counter value={sceneNumber(facts, scene)} />
            <span className={styles.counterLabel}>{tr(SCENES[scene].count)}</span>
          </p>

          <ol role="list" className={styles.scenes}>
            {SCENES.map((s, i) => (
              <li key={s.id} className={styles.scene} data-on={i === scene || undefined}>
                <figure className={styles.staticShot}>
                  <Photo id={s.photo} sizes="(min-width: 760px) 600px, 100vw" />
                </figure>
                <p className={styles.step}><s.icon size={16} strokeWidth={1.75} aria-hidden="true" />{tr(`filmStep_${s.id}` as CopyKey)}</p>
                <h3 className={styles.title}>
                  {tr(s.title, { n: fmt(facts?.gyms), c: fmt(facts?.counties) })}
                </h3>
                <p className={styles.body}>{tr(s.body)}</p>
                <p className={styles.staticCount}>
                  <strong>{sceneNumber(facts, i) ?? "–"}</strong> {tr(s.count)}
                </p>
                <SceneRows id={s.id} facts={facts} days={days} />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className={styles.steps} aria-hidden="true">
        {SCENES.map((s, i) => <div key={s.id} data-step={i} className={styles.marker} />)}
      </div>
    </section>
  );
}

function Row({ icon: I, label, note, order }: { icon: Icon; label: string; note: React.ReactNode; order: number }) {
  return (
    <li className={styles.row} style={{ "--order": order } as React.CSSProperties}>
      <span className={styles.rowIcon}><I size={18} strokeWidth={1.75} aria-hidden="true" /></span>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowNote}>{note}</span>
    </li>
  );
}

function SceneRows({ id, facts, days }: { id: SceneId; facts: Facts | null; days: string[] }) {
  const tr = useT();
  const n = (value: number | undefined) => (value == null ? "–" : String(value));
  if (id === "find") return (
    <ul role="list" className={styles.rows}>
      <Row icon={MapPin} label={tr("filmRowName")} note={tr("filmRowNameNote")} order={0} />
      <Row icon={Navigation} label={tr("filmRowDistance")} note={tr("filmRowDistanceNote")} order={1} />
    </ul>
  );
  if (id === "check") return (
    <ul role="list" className={styles.rows}>
      {TIERS.map((tier, i) => (
        <li key={tier} className={styles.row} style={{ "--order": i } as React.CSSProperties}>
          <TrustBadge tier={tier} />
          <span className={styles.rowNote}>{n(facts?.tiers[tier])}</span>
        </li>
      ))}
    </ul>
  );
  if (id === "known") return (
    <ul role="list" className={styles.rows}>
      <Row icon={Clock} label={tr("filmRowHours")} note={tr("filmRowHoursNote", { n: n(facts?.hours) })} order={0} />
      <Row icon={Phone} label={tr("filmRowContact")} note={tr("filmRowContactNote", { n: n(facts?.contact) })} order={1} />
      <Row icon={Tag} label={tr("filmRowPrice")} note={tr("filmRowPriceNote", { n: n(facts?.price) })} order={2} />
    </ul>
  );
  if (id === "plan") return (
    <ol role="list" className={styles.week}>
      {days.map((day, i) => (
        <li key={`${day}-${i}`} className={styles.day} data-train={TRAINING_DAYS.has(i) || undefined} style={{ "--order": i } as React.CSSProperties}>
          {day}
        </li>
      ))}
    </ol>
  );
  return null;
}
