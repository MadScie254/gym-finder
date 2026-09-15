"use client";

import { COUNTIES } from "@/lib/kenya";

type CountySearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (value: string) => void;
  onSelectCounty: (name: string) => void;
};

export default function CountySearch({
  query,
  onQueryChange,
  onSearch,
  onSelectCounty,
}: CountySearchProps) {
  const matches = query.trim()
    ? COUNTIES.filter((county) =>
        county.name.toLowerCase().includes(query.trim().toLowerCase()),
      ).slice(0, 6)
    : COUNTIES.slice(0, 6);

  return (
    <div className="relative">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(query);
        }}
      >
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search county, city, or gym"
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/55 px-4 text-sm text-white outline-none ring-lime-300/0 placeholder:text-slate-500 focus:ring-2"
        />
      </form>
      {query.trim() && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#151b24] shadow-2xl">
          {matches.map((county) => (
            <button
              key={county.name}
              type="button"
              className="block w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/5"
              onClick={() => onSelectCounty(county.name)}
            >
              {county.name} County
            </button>
          ))}
          <button
            type="button"
            className="block w-full px-4 py-3 text-left text-sm text-lime-300 hover:bg-white/5"
            onClick={() => onSearch(query)}
          >
            Search gyms for “{query}”
          </button>
        </div>
      )}
    </div>
  );
}
