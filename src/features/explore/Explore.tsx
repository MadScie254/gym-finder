import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { searchVenues } from "../../data/loadVenues";
import { useVenueContext } from "../../app/venue-context";
import { applyVenueFilters, sortVenues } from "../../lib/filterVenues";
import { isInKenya, NAIROBI } from "../../lib/kenya";
import { t } from "../../lib/i18n";
import { loadSavedVenues, saveSavedVenues } from "../../lib/storage";
import { SearchBox } from "../search/SearchBox";
import { ResultCard } from "../results/ResultCard";
import { Detail } from "../detail/Detail";
import type { Venue } from "../../data/types";

const KINDS = ["gym", "crossfit", "yoga", "pilates", "martial_arts", "boxing"] as const;

export function Explore() {
  const ctx = useVenueContext();
  const { slug, place } = useParams();
  const [params, setParams] = useSearchParams();
  const [saved, setSaved] = useState<Venue[]>(() => loadSavedVenues());
  const q = params.get("q") ?? place ?? "";
  const kind = params.get("kind") ?? "";
  const venue = slug ? ctx.index?.bySlug.get(slug) : undefined;

  const visible = useMemo(() => {
    if (!ctx.index) return [];
    const base = q ? searchVenues(ctx.index, q, true) : ctx.index.venues;
    const filtered = applyVenueFilters(base, {
      q,
      kind: kind || undefined,
      hasPhone: params.get("phone") === "1",
      tier: params.get("tier") ?? undefined,
      womenOnly: params.get("women") === "1",
      openNow: params.get("open") === "1",
      origin: ctx.origin,
      maxKm: params.get("km") ? Number(params.get("km")) : null,
    });
    return sortVenues(filtered, ctx.origin);
  }, [ctx.index, ctx.origin, q, kind, params]);

  useEffect(() => { ctx.setVisible(visible); }, [visible, ctx.setVisible]);
  useEffect(() => { if (venue) ctx.setSelectedId(venue.id); }, [venue, ctx.setSelectedId]);

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  function locate() {
    if (!navigator.geolocation) {
      ctx.setLocationNote("This browser cannot share location. Browsing from Nairobi.");
      ctx.setOrigin(NAIROBI);
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!isInKenya(point)) {
        ctx.setLocationNote("That location is outside Kenya. Showing Nairobi.");
        ctx.setOrigin(NAIROBI);
        return;
      }
      ctx.setLocationNote("Location stays on this device.");
      ctx.setOrigin(point);
    }, () => {
      ctx.setLocationNote("Location was not shared. Browsing from Nairobi.");
      ctx.setOrigin(NAIROBI);
    });
  }

  function onSave(item: Venue) {
    const next = saved.some((row) => row.id === item.id)
      ? saved.filter((row) => row.id !== item.id)
      : [...saved, item];
    setSaved(next);
    saveSavedVenues(next);
  }

  return (
    <section className="rail">
      <SearchBox index={ctx.index} lang={ctx.lang} initial={q} />
      <div className="chips" role="group" aria-label={t(ctx.lang, "filters")}>
        {KINDS.map((item) => (
          <button key={item} type="button" className={kind === item ? "chip chip--on" : "chip"} onClick={() => toggle("kind", item)}>{item}</button>
        ))}
        <button type="button" className={params.get("phone") === "1" ? "chip chip--on" : "chip"} onClick={() => toggle("phone", "1")}>Has phone</button>
        <button type="button" className={params.get("open") === "1" ? "chip chip--on" : "chip"} onClick={() => toggle("open", "1")}>Open now</button>
        <button type="button" className="chip" onClick={locate}>{t(ctx.lang, "nearMe")}</button>
      </div>
      {ctx.locationNote && <p className="muted">{ctx.locationNote}</p>}
      {ctx.loading && <p>Loading catalogue…</p>}
      {ctx.error && <p>{ctx.error}</p>}
      {venue ? <Detail venue={venue} lang={ctx.lang} origin={ctx.origin} /> : (
        <div className="result-list">
          <p className="muted">{visible.length} in this list{ctx.index ? ` · data ${ctx.index.manifest.builtAt.slice(0, 10)}` : ""}</p>
          {visible.length === 0 && !ctx.loading && <p>No gyms match. Relax a filter or search a county.</p>}
          {visible.slice(0, 80).map((item) => (
            <ResultCard
              key={item.id}
              venue={item}
              origin={ctx.origin}
              lang={ctx.lang}
              selected={ctx.selectedId === item.id}
              saved={saved.some((row) => row.id === item.id)}
              onSave={() => onSave(item)}
            />
          ))}
          <p className="muted"><Link to="/commute">{t(ctx.lang, "commute")}</Link> · <Link to="/compare">{t(ctx.lang, "compare")}</Link></p>
        </div>
      )}
    </section>
  );
}
