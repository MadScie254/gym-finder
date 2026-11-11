import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { searchVenues } from "../../data/loadVenues";
import { useVenueContext } from "../../app/venue-context";
import { applyVenueFilters, foldPlace, isKnownPlace, sortVenues, venuesInPlace } from "../../lib/filterVenues";
import { suggestKenyaPlaces } from "../../lib/kenyaPlaces";
import { t } from "../../lib/i18n";
import { NAIROBI } from "../../lib/kenya";
import { loadSavedVenues, saveSavedVenues } from "../../lib/storage";
import { SearchBox } from "../search/SearchBox";
import { kindLabel, ResultCard } from "../results/ResultCard";
import { Detail } from "../detail/Detail";
import type { Venue } from "../../data/types";

const KINDS = ["gym", "crossfit", "yoga", "pilates", "martial_arts", "boxing"] as const;

export function Explore() {
  const ctx = useVenueContext();
  const { slug, place } = useParams();
  const [params, setParams] = useSearchParams();
  const [saved, setSaved] = useState<Venue[]>(() => loadSavedVenues());
  const q = params.get("q") ?? "";
  const placeName = place ? decodeURIComponent(place) : null;
  const kind = params.get("kind") ?? "";
  const venue = slug ? ctx.index?.bySlug.get(slug) : undefined;
  const compareIds = [...new Set((params.get("ids") ?? "").split(","))]
    .filter((id) => ctx.index?.byId.has(id)).slice(0, 3);

  const visible = useMemo(() => {
    if (!ctx.index) return [];
    // Place pages (and a typed query that is exactly a place) filter by place, not fuzzy text.
    const asPlace = placeName ?? (q && isKnownPlace(ctx.index.venues, q) ? q : null);
    let base: Venue[];
    if (asPlace) {
      const hit = suggestKenyaPlaces(asPlace, 5).find((row) => foldPlace(row.name) === foldPlace(asPlace));
      base = venuesInPlace(ctx.index.venues, asPlace, hit?.location ?? null);
    } else {
      base = q ? searchVenues(ctx.index, q, true) : ctx.index.venues;
    }
    const filtered = applyVenueFilters(base, {
      q: asPlace ? undefined : q,
      kind: kind || undefined,
      hasPhone: params.get("phone") === "1",
      tier: params.get("tier") ?? undefined,
      womenOnly: params.get("women") === "1",
      openNow: params.get("open") === "1",
      origin: ctx.origin,
      maxKm: params.get("km") ? Number(params.get("km")) : null,
    });
    return sortVenues(filtered, ctx.origin ?? (!q ? NAIROBI : null));
  }, [ctx.index, ctx.origin, q, placeName, kind, params]);

  useEffect(() => { ctx.setVisible(visible); }, [visible, ctx.setVisible]);
  useEffect(() => { ctx.setSelectedId(venue?.id ?? null); }, [venue, ctx.setSelectedId]);

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  function onSave(item: Venue) {
    const next = saved.some((row) => row.id === item.id)
      ? saved.filter((row) => row.id !== item.id)
      : [...saved, item];
    setSaved(next);
    saveSavedVenues(next);
  }

  function onCompare(item: Venue) {
    const nextIds = compareIds.includes(item.id)
      ? compareIds.filter((id) => id !== item.id)
      : [...compareIds, item.id].slice(0, 3);
    const next = new URLSearchParams(params);
    if (nextIds.length) next.set("ids", nextIds.join(","));
    else next.delete("ids");
    setParams(next);
  }

  const built = ctx.index?.manifest.builtAt.slice(0, 10);
  return (
    <section className="explore-page">
      <header className="finder-head">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">F</span>
          <div>
            <strong>Find My Gym</strong>
            <small>{ctx.index ? `${ctx.index.manifest.counts.defaultVisible} mapped gyms · ${built}` : "Kenya"}</small>
          </div>
        </div>
        {!q && !venue && <div className="finder-intro">
          <span className="finder-intro__eyebrow">KENYA · FIND YOUR PLACE</span>
          <h1>Find your next <em>move.</em></h1>
          <p>Discover gyms across Kenya. See what we know, compare your options, then make your move.</p>
        </div>}
        <SearchBox index={ctx.index} lang={ctx.lang} initial={q || placeName || ""} />
        <div className="chips" role="group" aria-label={t(ctx.lang, "filters")}>
          {KINDS.map((item) => (
            <button key={item} type="button" className={kind === item ? "chip chip--on" : "chip"} onClick={() => toggle("kind", item)}>{kindLabel(item)}</button>
          ))}
          <button type="button" className={params.get("phone") === "1" ? "chip chip--on" : "chip"} onClick={() => toggle("phone", "1")}>Has phone</button>
          <button type="button" className={params.get("open") === "1" ? "chip chip--on" : "chip"} onClick={() => toggle("open", "1")}>Open now</button>
        </div>
      </header>
      {ctx.locationNote && <p className="count">{ctx.locationNote}</p>}
      {!ctx.origin && !q && !venue && <p className="browse-note">Showing Nairobi first · Search another area or use the map</p>}
      {ctx.loading && <p className="count">Loading gyms…</p>}
      {ctx.error && <p className="count">{ctx.error}</p>}
      {venue ? <Detail venue={venue} lang={ctx.lang} origin={ctx.origin} /> : (
        <div className="result-list">
          <div className="result-toolbar">
            <p className="count">{visible.length} gyms in this list</p>
            <Link to={`/compare${compareIds.length ? `?ids=${encodeURIComponent(compareIds.join(","))}` : ""}`}>Compare gyms{compareIds.length ? ` (${compareIds.length})` : ""}</Link>
          </div>
          {visible.length === 0 && !ctx.loading && <p>No gyms match. Clear a filter or search a county.</p>}
          {visible.slice(0, 80).map((item) => (
            <ResultCard
              key={item.id}
              venue={item}
              origin={ctx.origin}
              selected={ctx.selectedId === item.id}
              saved={saved.some((row) => row.id === item.id)}
              onSave={() => onSave(item)}
              compared={compareIds.includes(item.id)}
              onCompare={() => onCompare(item)}
              compareDisabled={compareIds.length >= 3}
            />
          ))}
          <p className="count"><Link to="/commute">{t(ctx.lang, "commute")}</Link> · <Link to="/compare">{t(ctx.lang, "compare")}</Link></p>
        </div>
      )}
    </section>
  );
}
