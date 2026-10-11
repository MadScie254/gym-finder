import { lazy, Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useVenueContext } from "./venue-context";
import { t } from "../lib/i18n";

const MapPane = lazy(() => import("../features/map/MapPane").then((mod) => ({ default: mod.MapPane })));

export function Shell() {
  const { lang, offline, index, visible, selectedId } = useVenueContext();
  const location = useLocation();
  const showMap = ["/", "/search"].includes(location.pathname)
    || location.pathname.startsWith("/gym/")
    || location.pathname.startsWith("/in/");
  const date = index?.manifest.builtAt.slice(0, 10);

  return (
    <div className="shell">
      {offline && <p className="banner" role="status">{t(lang, "offline")}{date ? ` ${date}` : ""}</p>}
      <div className={showMap ? "shell__body shell__body--map" : "shell__body"}>
        <div className="shell__rail"><Outlet /></div>
        {showMap && (
          <Suspense fallback={<p className="map-fallback">Map loads after the list. The list works without it.</p>}>
            <MapPane venues={visible} selectedId={selectedId} />
          </Suspense>
        )}
      </div>
      <nav className="bottom-nav" aria-label="Primary">
        <NavLink to="/">{t(lang, "explore")}</NavLink>
        <NavLink to="/saved">{t(lang, "saved")}</NavLink>
        <NavLink to="/plan">{t(lang, "plan")}</NavLink>
        <NavLink to="/more">{t(lang, "more")}</NavLink>
      </nav>
    </div>
  );
}
