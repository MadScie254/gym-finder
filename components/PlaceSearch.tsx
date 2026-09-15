"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTIES } from "@/lib/kenya";
import { fetchPlaceSuggestions } from "@/lib/placesClient";
import type { PlaceHit } from "@/lib/osmPlaces";

type PlaceSearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (value: string) => void;
  onSelectPlace: (place: PlaceHit) => void;
};

export default function PlaceSearch({
  query,
  onQueryChange,
  onSearch,
  onSelectPlace,
}: PlaceSearchProps) {
  const [suggestions, setSuggestions] = useState<PlaceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const localCounties = COUNTIES.filter((county) =>
      county.name.toLowerCase().includes(trimmed.toLowerCase()),
    )
      .slice(0, 3)
      .map(
        (county): PlaceHit => ({
          id: `county/${county.name}`,
          name: county.name,
          subtitle: "County · Kenya",
          kind: "county",
          location: { lat: county.lat, lng: county.lng },
        }),
      );

    setSuggestions(localCounties);
    setLoading(true);
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      void fetchPlaceSuggestions(trimmed)
        .then((places) => {
          if (id !== requestId.current) return;
          const merged: PlaceHit[] = [];
          const seen = new Set<string>();
          for (const place of [...localCounties, ...places]) {
            const key = place.name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(place);
          }
          setSuggestions(merged.slice(0, 8));
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setSuggestions(localCounties);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  const showMenu = open && query.trim().length >= 1;

  return (
    <div className="search-wrap">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(false);
          onSearch(query);
        }}
      >
        <label className="search-field">
          <span className="search-field__icon" aria-hidden>
            ⌕
          </span>
          <input
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 140)}
            placeholder="Webuye, Kilimani, Mombasa, gym name…"
            className="search-field__input"
            autoComplete="off"
          />
          {loading ? <span className="search-field__status">…</span> : null}
        </label>
      </form>
      {showMenu && (
        <div className="search-menu">
          {suggestions.map((place) => (
            <button
              key={place.id}
              type="button"
              className="search-menu__item"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(false);
                onSelectPlace(place);
              }}
            >
              <span>
                <strong>{place.name}</strong>
                <em>{place.subtitle}</em>
              </span>
              <small>{place.kind}</small>
            </button>
          ))}
          <button
            type="button"
            className="search-menu__item is-accent"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(false);
              onSearch(query);
            }}
          >
            Search Kenya for “{query.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
