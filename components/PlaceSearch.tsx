"use client";

import { useId, useMemo, useState } from "react";
import { COUNTIES } from "@/lib/kenya";
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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuId = useId();
  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return COUNTIES.filter((county) => county.name.toLowerCase().includes(trimmed))
      .slice(0, 5)
      .map(
        (county): PlaceHit => ({
          id: `county/${county.name}`,
          name: county.name,
          subtitle: "County · Kenya",
          kind: "county",
          location: { lat: county.lat, lng: county.lng },
        }),
      );
  }, [query]);

  const showMenu = open && query.trim().length >= 1;
  const optionCount = suggestions.length + 1;

  const chooseActiveOption = () => {
    if (activeIndex < 0) return false;
    setOpen(false);
    if (activeIndex < suggestions.length) {
      onSelectPlace(suggestions[activeIndex]);
    } else {
      onSearch(query);
    }
    return true;
  };

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
              role="combobox"
              aria-label="Search Kenyan gyms, towns, estates, or counties"
              aria-autocomplete="list"
              aria-controls={showMenu ? menuId : undefined}
              aria-expanded={showMenu}
              aria-haspopup="listbox"
              aria-activedescendant={
                showMenu && activeIndex >= 0 ? `${menuId}-option-${activeIndex}` : undefined
              }
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setActiveIndex(-1);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 140)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((current) => Math.min(current + 1, optionCount - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((current) => Math.max(current - 1, 0));
                } else if (event.key === "Escape") {
                  setOpen(false);
                  setActiveIndex(-1);
                } else if (event.key === "Enter" && chooseActiveOption()) {
                  event.preventDefault();
                }
              }}
              placeholder="Webuye, Kilimani, Mombasa, gym name…"
              className="search-field__input"
              autoComplete="off"
            />
          </label>
        </form>
      {showMenu && (
        <div id={menuId} className="search-menu" role="listbox" aria-label="County suggestions">
          {suggestions.map((place, index) => (
            <button
              key={place.id}
              id={`${menuId}-option-${index}`}
              type="button"
              className={`search-menu__item ${activeIndex === index ? "is-active" : ""}`}
              role="option"
              aria-selected={activeIndex === index}
              onMouseEnter={() => setActiveIndex(index)}
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
            id={`${menuId}-option-${suggestions.length}`}
            type="button"
            className={`search-menu__item is-accent ${
              activeIndex === suggestions.length ? "is-active" : ""
            }`}
            role="option"
            aria-selected={activeIndex === suggestions.length}
            onMouseEnter={() => setActiveIndex(suggestions.length)}
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
