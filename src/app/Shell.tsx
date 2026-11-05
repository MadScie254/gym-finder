import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useVenueContext } from "./venue-context";
import { t } from "../lib/i18n";
import { isInKenya, NAIROBI } from "../lib/kenya";

const useGoogleMap = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_MAP_ID);
const MapPane = lazy(async () => {
  const mod = useGoogleMap
    ? await import("../features/map/GoogleMapPane")
    : await import("../features/map/MapPane");
  return { default: mod.MapPane };
});

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TABS = [
  { to: "/", label: "explore" as const, icon: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" },
  { to: "/saved", label: "saved" as const, icon: "M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z" },
  { to: "/plan", label: "plan" as const, icon: "M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" },
  { to: "/more", label: "more" as const, icon: "M5 7h14M5 12h14M5 17h14" },
];

export function Shell() {
  const { lang, offline, index, visible, selectedId, origin, setOrigin, setLocationNote } = useVenueContext();
  const location = useLocation();
  const showMap = location.pathname === "/" || location.pathname === "/search"
    || location.pathname.startsWith("/gym/")
    || location.pathname.startsWith("/in/");
  const [mode, setMode] = useState<"list" | "map">("list");
  const [wide, setWide] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(min-width: 800px)").matches));
  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 800px)");
    if (!media) return;
    const update = () => setWide(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (location.pathname.startsWith("/gym/")) setMode("list");
  }, [location.pathname]);
  const date = index?.manifest.builtAt.slice(0, 10);

  function locate() {
    if (!navigator.geolocation) {
      setLocationNote("This browser cannot share location. Browsing from Nairobi.");
      setOrigin(NAIROBI);
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!isInKenya(point)) {
        setLocationNote("That location is outside Kenya. Showing Nairobi.");
        setOrigin(NAIROBI);
        return;
      }
      setLocationNote("Location stays on this device.");
      setOrigin(point);
    }, () => {
      setLocationNote("Location was not shared. Browsing from Nairobi.");
      setOrigin(NAIROBI);
    });
  }

  return (
    <div className="app">
      {offline && <p className="banner" role="status">{t(lang, "offline")}{date ? ` ${date}` : ""}</p>}
      <div className={`workspace${showMap ? ` workspace--${mode}` : " workspace--list"}`}>
        <aside className="panel">
          <nav className="desk-nav" aria-label="Primary">
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.to === "/"}>{t(lang, tab.label)}</NavLink>
            ))}
          </nav>
          <Outlet />
        </aside>
        {showMap && (
          <div className="map-slot">
            {(wide || mode === "map") && <Suspense fallback={<p className="map-fallback">List is ready. Map is still loading.</p>}>
              <MapPane venues={visible} selectedId={selectedId} origin={origin} />
            </Suspense>}
            <span className="map-stamp">{visible.length} mapped gyms</span>
            <button type="button" className="locate" onClick={locate} aria-label={t(lang, "nearMe")}>
              <Icon d="M12 4v3M12 17v3M4 12h3M17 12h3M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </button>
          </div>
        )}
        {showMap && <div className="view-toggle" role="group" aria-label="List or map">
          <button type="button" aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button>
          <button type="button" aria-pressed={mode === "map"} onClick={() => setMode("map")}>Map</button>
        </div>}
      </div>
      <nav className="tabbar" aria-label="Primary">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === "/"}>
            <Icon d={tab.icon} />
            {t(lang, tab.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
