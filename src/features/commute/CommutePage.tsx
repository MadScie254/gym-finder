import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useVenueContext } from "../../app/venue-context";
import { pointToSegmentKm, NAIROBI } from "../../lib/kenya";
import { suggestKenyaPlaces } from "../../lib/kenyaPlaces";

export function CommutePage() {
  const { index, origin } = useVenueContext();
  const [work, setWork] = useState("Westlands");
  const home = origin ?? NAIROBI;
  const workPoint = suggestKenyaPlaces(work, 1)[0]?.location ?? null;
  const ranked = useMemo(() => {
    if (!index || !workPoint) return [];
    return [...index.venues]
      .filter((venue) => venue.trust.tier !== "unconfirmed")
      .map((venue) => ({
        venue,
        km: pointToSegmentKm({ lat: venue.lat, lng: venue.lng }, home, workPoint),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 12);
  }, [index, home, workPoint]);

  return (
    <section className="page">
      <h1>Near your commute line</h1>
      <p className="muted">Distance to a straight line between two points, not a road route or travel time. {origin ? "Your starting point stays on this device." : "Without your location, the starting point is central Nairobi."}</p>
      <label>Work or landmark
        <input value={work} onChange={(event) => setWork(event.target.value)} />
      </label>
      {!workPoint && <p>Pick a known place name.</p>}
      <ol>
        {ranked.map(({ venue, km }) => (
          <li key={venue.id}><Link to={`/gym/${venue.slug}`}>{venue.name}</Link> — ≈ {km.toFixed(1)} km from the straight line</li>
        ))}
      </ol>
    </section>
  );
}
