import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useVenueContext } from "../../app/venue-context";

export function ComparePage() {
  const { index } = useVenueContext();
  const [params, setParams] = useSearchParams();
  const [candidateId, setCandidateId] = useState("");
  const ids = [...new Set((params.get("ids") ?? "").split(","))]
    .filter((id) => index?.byId.has(id)).slice(0, 3);
  const venues = ids.map((id) => index?.byId.get(id)).filter((venue) => venue != null);
  const available = index?.venues.filter((venue) => !ids.includes(venue.id)) ?? [];

  function updateIds(nextIds: string[]) {
    const next = new URLSearchParams(params);
    if (nextIds.length) next.set("ids", nextIds.join(","));
    else next.delete("ids");
    setParams(next);
  }

  return (
    <section className="page">
      <h1>Compare</h1>
      <p className="muted">Compare up to three gyms. The page link keeps your selection.</p>
      {ids.length < 3 && available.length > 0 && <div className="compare-picker">
        <label>Choose a gym
          <select value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
            <option value="">Select a gym</option>
            {available.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.county ?? "Area unknown"}</option>)}
          </select>
        </label>
        <button type="button" className="btn" disabled={!candidateId} onClick={() => {
          if (!candidateId || !index?.byId.has(candidateId)) return;
          updateIds([...ids, candidateId]);
          setCandidateId("");
        }}>Add gym</button>
      </div>}
      {venues.length === 0 && <p>Choose a gym above, or <Link to="/">browse the list</Link>.</p>}
      <div className="compare-grid">
        {venues.map((venue) => (
          <article key={venue.id}>
            <h2><Link to={`/gym/${venue.slug}`}>{venue.name}</Link></h2>
            <p>{venue.trust.tier}</p>
            <p>{venue.phones[0] ?? "No phone"}</p>
            <p>{venue.hours?.raw ?? "Hours not listed — call to confirm."}</p>
            <p>{venue.address ?? "Address not listed."}</p>
            <button type="button" className="btn btn--ghost" onClick={() => updateIds(ids.filter((id) => id !== venue.id))}>Remove {venue.name}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
