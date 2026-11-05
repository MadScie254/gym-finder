import { useState } from "react";
import { Link } from "react-router";
import { loadSavedVenues, saveSavedVenues } from "../../lib/storage";
import type { Venue } from "../../data/types";

export function SavedPage() {
  const [saved, setSaved] = useState<Venue[]>(() => loadSavedVenues());
  return (
    <section className="page">
      <h1>Saved gyms</h1>
      <p className="muted">Stored on this device only. A snapshot stays even if the catalogue refreshes.</p>
      {saved.length === 0 && <p>No saved gyms yet.</p>}
      <ul>
        {saved.map((venue) => (
          <li key={venue.id}><Link to={`/gym/${venue.slug}`}>{venue.name}</Link></li>
        ))}
      </ul>
      {saved.length > 0 && (
        <button type="button" className="btn" onClick={() => { setSaved([]); saveSavedVenues([]); }}>Clear</button>
      )}
    </section>
  );
}
