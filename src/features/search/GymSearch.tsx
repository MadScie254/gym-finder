import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useT, useVenueContext } from "../../app/venue-context";
import { loadLandmarks, type Landmark } from "../../lib/landmarks";
import { buildSuggestions } from "../../lib/searchModel";
import { loadRecentSearches, saveRecentSearch, type RecentSearch } from "../../lib/storage";
import { NO_FILTERS, parseFilters, queryString, writeFilters } from "../../lib/urlState";
import { SearchField } from "../../ui/SearchField";

/** The one search box: gyms, areas, landmarks and counties, grouped (plan G2). */
export function GymSearch({ label, placeholder }: { label?: string; placeholder?: string }) {
  const tr = useT();
  const { index, locate } = useVenueContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const onSearch = location.pathname === "/search";
  const urlQuery = onSearch ? params.get("q") ?? "" : "";
  const [value, setValue] = useState(urlQuery);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [recent, setRecent] = useState<RecentSearch[]>(() => loadRecentSearches());

  // Back and forward restore the text that produced the list.
  useEffect(() => { if (onSearch) setValue(urlQuery); }, [urlQuery, onSearch]);

  function warm() {
    if (!landmarks) loadLandmarks().then(setLandmarks).catch(() => undefined);
  }

  const groups = useMemo(
    () => buildSuggestions({ index, landmarks, query: value, recent, tr }),
    [index, landmarks, value, recent, tr],
  );

  function go(href: string, labelText: string) {
    saveRecentSearch({ label: labelText, href });
    setRecent(loadRecentSearches());
    navigate(href);
  }

  return (
    <SearchField
      label={label ?? tr("searchLabel")}
      placeholder={placeholder ?? tr("searchPlaceholder")}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        warm();
        if (!next && onSearch && params.get("q")) navigate(`/search${queryString(writeFilters({ ...parseFilters(params), q: "" }, params))}`);
      }}
      groups={groups}
      minChars={0}
      onFocus={warm}
      onSelect={(option) => {
        setValue(option.label);
        go(option.href, option.label);
      }}
      onSubmit={(text) => {
        const keep = onSearch ? parseFilters(params) : NO_FILTERS;
        go(`/search${queryString(writeFilters({ ...keep, q: text }))}`, text);
      }}
      emptyText={tr("searchEmpty")}
      countText={(n) => tr("searchSuggestions", { n })}
      onLocate={locate}
      locateLabel={tr("locate")}
    />
  );
}
