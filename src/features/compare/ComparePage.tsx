import { Link, useSearchParams } from "react-router";
import { useVenueContext } from "../../app/venue-context";

export function ComparePage() {
  const { index } = useVenueContext();
  const [params, setParams] = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean).slice(0, 3);
  const venues = ids.map((id) => index?.byId.get(id)).filter((venue) => venue != null);

  return (
    <section className="page">
      <h1>Compare</h1>
      <p className="muted">Up to three gyms. Share this page’s link.</p>
      <label>Add by search, then paste ids
        <input
          placeholder="id,id"
          defaultValue={params.get("ids") ?? ""}
          onBlur={(event) => {
            const next = new URLSearchParams(params);
            next.set("ids", event.target.value);
            setParams(next);
          }}
        />
      </label>
      {venues.length === 0 && <p>Choose gyms from the list, or add ids above. {index ? <Link to="/">Browse</Link> : null}</p>}
      <div className="compare-grid">
        {venues.map((venue) => (
          <article key={venue.id}>
            <h2><Link to={`/gym/${venue.slug}`}>{venue.name}</Link></h2>
            <p>{venue.trust.tier}</p>
            <p>{venue.phones[0] ?? "No phone"}</p>
            <p>{venue.hours?.raw ?? "Hours not listed — call to confirm."}</p>
            <p>{venue.address ?? "Address not listed."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
