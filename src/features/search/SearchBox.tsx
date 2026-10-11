import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { VenueIndex } from "../../data/loadVenues";
import { searchVenues } from "../../data/loadVenues";
import { suggestKenyaPlaces } from "../../lib/kenyaPlaces";
import { saveRecentSearch } from "../../lib/storage";
import type { Lang } from "../../lib/i18n";
import { t } from "../../lib/i18n";

type Row = { id: string; label: string; hint: string; href: string };

export function SearchBox({
  index,
  lang,
  initial,
}: {
  index: VenueIndex | null;
  lang: Lang;
  initial: string;
}) {
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const navigate = useNavigate();

  const rows = useMemo(() => {
    if (!index || query.trim().length < 2) return [] as Row[];
    const gyms = searchVenues(index, query, true).slice(0, 6).map((venue) => ({
      id: venue.id,
      label: venue.name,
      hint: venue.trust.tier === "unconfirmed" ? "Unconfirmed" : [venue.area, venue.county].filter(Boolean).join(" · "),
      href: `/gym/${venue.slug}`,
    }));
    const places = suggestKenyaPlaces(query, 4).map((place) => ({
      id: place.id,
      label: place.name,
      hint: place.subtitle,
      href: place.kind === "county" ? `/in/${encodeURIComponent(place.name)}` : `/search?q=${encodeURIComponent(place.name)}`,
    }));
    return [...gyms, ...places];
  }, [index, query]);

  useEffect(() => { setActive(0); }, [query]);

  function go(row: Row) {
    saveRecentSearch(query.trim());
    setOpen(false);
    navigate(row.href);
  }

  return (
    <div className="search-box">
      <label className="sr-only" htmlFor="gym-search">{t(lang, "search")}</label>
      <input
        id="gym-search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={t(lang, "search")}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setActive((n) => Math.min(rows.length - 1, n + 1)); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActive((n) => Math.max(0, n - 1)); }
          if (event.key === "Enter" && rows[active]) { event.preventDefault(); go(rows[active]); }
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {open && rows.length > 0 && (
        <ul id={listId} role="listbox" className="search-box__list">
          {rows.map((row, indexRow) => (
            <li key={row.id} role="option" aria-selected={indexRow === active}>
              <button type="button" className={indexRow === active ? "is-active" : ""} onClick={() => go(row)}>
                <strong>{row.label}</strong>
                <span>{row.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
