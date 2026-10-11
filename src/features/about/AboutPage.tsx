import { useVenueContext } from "../../app/venue-context";
import { t } from "../../lib/i18n";

export function AboutPage() {
  const { index, lang } = useVenueContext();
  const manifest = index?.manifest;
  return (
    <section className="rail">
      <h1>{t(lang, "about")}</h1>
      {!manifest && <p>Catalogue not loaded.</p>}
      {manifest && (
        <>
          <p>Built {manifest.builtAt.slice(0, 10)}. Overture release: {manifest.overtureRelease ?? "not in this build"}. OSM snapshot: {manifest.osmSnapshotAt ?? "unknown"}{manifest.osmStale ? " (stale)" : ""}.</p>
          <p>{manifest.counts.defaultVisible} default-visible of {manifest.counts.total} records.</p>
          <h2>By tier</h2>
          <ul>
            {Object.entries(manifest.counts.byTier).map(([tier, count]) => <li key={tier}>{tier}: {count}</li>)}
          </ul>
          <h2>What the tiers mean</h2>
          <ul>
            <li>Verified — a human override file newer than 12 months. Nothing else may use that word.</li>
            <li>Corroborated — OpenStreetMap and Overture agree, or a high-confidence Overture listing with a contact.</li>
            <li>Listed — one source. Call to confirm hours and price.</li>
            <li>Unconfirmed — hidden from the default list. Exact-name search can still find it.</li>
          </ul>
          <h2>Licences</h2>
          <ul>{manifest.licenses.map((item) => <li key={item}>{item}</li>)}</ul>
          {manifest.notices.map((item) => <p key={item}>{item}</p>)}
        </>
      )}
    </section>
  );
}
