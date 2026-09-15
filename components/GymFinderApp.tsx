"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterSheet from "./FilterSheet";
import GymDetail from "./GymDetail";
import GymList from "./GymList";
import InstallPrompt from "./InstallPrompt";
import PlaceSearch from "./PlaceSearch";
import ProfileForm from "./ProfileForm";
import { findCounty, haversineKm, isInKenya, NAIROBI } from "@/lib/kenya";
import type { PlaceHit } from "@/lib/osmPlaces";
import { fetchGymDetails, fetchNearbyGyms, fetchSearchGyms } from "@/lib/placesClient";
import { rankGyms } from "@/lib/scoreGyms";
import {
  hasOnboarded,
  loadFavorites,
  loadProfile,
  markOnboarded,
  saveFavorites,
  saveProfile,
} from "@/lib/storage";
import {
  DEFAULT_FILTERS,
  DEFAULT_PROFILE,
  type ClientProfile,
  type Gym,
  type GymFilters,
  type LatLng,
} from "@/lib/types";

type SheetMode = "list" | "detail" | "filters" | "profile" | "onboarding";
type SheetSize = "peek" | "half" | "full";
type ListTab = "suggested" | "saved";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-canvas map-canvas--loading" />,
});

export default function GymFinderApp() {
  const [origin, setOrigin] = useState<LatLng>(NAIROBI);
  const [mapCenter, setMapCenter] = useState<LatLng>(NAIROBI);
  const [rawGyms, setRawGyms] = useState<Gym[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile>(DEFAULT_PROFILE);
  const [filters, setFilters] = useState<GymFilters>(DEFAULT_FILTERS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>("list");
  const [sheetSize, setSheetSize] = useState<SheetSize>("half");
  const [tab, setTab] = useState<ListTab>("suggested");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setProfile(loadProfile());
      setFavorites(loadFavorites());
      if (!hasOnboarded()) {
        setSheetMode("onboarding");
        setSheetSize("full");
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const rankedGyms = useMemo(
    () => rankGyms(rawGyms, origin, profile, filters),
    [rawGyms, origin, profile, filters],
  );
  const savedGyms = useMemo(
    () => rankedGyms.filter((gym) => favorites.includes(gym.id)),
    [rankedGyms, favorites],
  );
  const selectedGym = rankedGyms.find((gym) => gym.id === selectedId) ?? null;
  const visibleGyms = tab === "saved" ? savedGyms : rankedGyms;
  const showSearchArea = haversineKm(origin, mapCenter) > 0.45 && sheetMode === "list";

  const loadNearby = useCallback(async (center: LatLng, radiusMeters: number, label?: string) => {
    setLoading(true);
    setNotice(label ?? null);
    try {
      const result = await fetchNearbyGyms(center, radiusMeters);
      setRawGyms(result.gyms);
      setNotice(result.warning ?? label ?? null);
      setOrigin(center);
      setMapCenter(center);
      setSelectedId(null);
      setTab("suggested");
      setSheetMode("list");
      setSheetSize("half");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load gyms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Start with a useful, non-sensitive default. Precise location is requested
    // only after the visitor activates the Near me control.
    const timer = window.setTimeout(() => {
      void loadNearby(NAIROBI, filters.radiusMeters, "Showing Nairobi — use Near me for local results.");
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const radiusReady = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!radiusReady.current) {
      radiusReady.current = true;
      return;
    }
    void loadNearby(origin, filters.radiusMeters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.radiusMeters]);

  useEffect(() => {
    if (!selectedId || selectedId.startsWith("demo-")) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setDetailsLoading(true);
    });
    fetchGymDetails(selectedId)
      .then((details) => {
        if (!cancelled) {
          setRawGyms((current) =>
            current.map((gym) => (gym.id === details.id ? { ...gym, ...details } : gym)),
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const onIdleCenter = useCallback((center: LatLng) => setMapCenter(center), []);

  const selectGym = (id: string) => {
    setSelectedId(id);
    setSheetMode("detail");
    setSheetSize("full");
  };

  const toggleSave = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      saveFavorites(next);
      return next;
    });
  };

  const goToPlace = async (place: PlaceHit) => {
    setQuery("");
    await loadNearby(
      place.location,
      Math.max(filters.radiusMeters, place.kind === "county" ? 15000 : 10000),
      `Gyms near ${place.name}`,
    );
  };

  const handleSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const county = findCounty(trimmed);
    setQuery("");
    if (county) {
      await loadNearby(
        { lat: county.lat, lng: county.lng },
        Math.max(filters.radiusMeters, 10000),
        `Gyms in ${county.name}`,
      );
      return;
    }
    setLoading(true);
    try {
      const result = await fetchSearchGyms(trimmed, origin);
      setRawGyms(result.gyms);
      setSelectedId(null);
      setTab("suggested");
      setSheetMode("list");
      setSheetSize("half");
      setNotice(result.warning ?? `Results for “${trimmed}”`);
      if (result.gyms[0]) {
        setOrigin(result.gyms[0].location);
        setMapCenter(result.gyms[0].location);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const closeToList = () => {
    setSheetMode("list");
    setSheetSize("half");
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setNotice("Location is not supported in this browser.");
      return;
    }
    setNotice("Allow location to find gyms near you. Your coordinates are not saved.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (isInKenya(point)) void loadNearby(point, filters.radiusMeters);
        else setNotice("Location is outside Kenya.");
      },
      () => setNotice("Location was not shared — still showing Nairobi."),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
    );
  };

  const panelBody = (
    <>
      {sheetMode === "onboarding" && (
        <ProfileForm
          kicker="Towns · counties · OpenStreetMap"
          title="Train anywhere in Kenya."
          subtitle="Set your brief once. We rank mapped gyms by distance and training fit."
          profile={profile}
          primaryLabel="Show my matches"
          secondaryLabel="Skip for now"
          onChange={setProfile}
          onSubmit={() => {
            saveProfile(profile);
            markOnboarded();
            closeToList();
          }}
          onSecondary={() => {
            markOnboarded();
            closeToList();
          }}
        />
      )}

      {sheetMode === "profile" && (
        <ProfileForm
          title="Your training brief"
          subtitle="Saved on this device only. Matches reshuffle as you edit."
          profile={profile}
          primaryLabel="Save brief"
          secondaryLabel="Cancel"
          onChange={setProfile}
          onSubmit={() => {
            saveProfile(profile);
            closeToList();
          }}
          onSecondary={closeToList}
        />
      )}

      {sheetMode === "filters" && (
        <FilterSheet filters={filters} onChange={setFilters} onClose={closeToList} />
      )}

      {sheetMode === "detail" && selectedGym && (
        <GymDetail
          gym={selectedGym}
          saved={favorites.includes(selectedGym.id)}
          loadingDetails={detailsLoading}
          onClose={closeToList}
          onToggleSave={() => toggleSave(selectedGym.id)}
        />
      )}

      {sheetMode === "list" && (
        <div className="list-head">
          <div className="list-head__row">
            <div className="list-head__titles">
              <p className="eyebrow">Suggested for you</p>
              <h1>
                {loading
                  ? "Mapping…"
                  : `${visibleGyms.length} ${tab === "saved" ? "saved" : "nearby"}`}
              </h1>
            </div>
            <div className="seg">
              <button
                type="button"
                className={tab === "suggested" ? "is-on" : ""}
                aria-pressed={tab === "suggested"}
                onClick={() => setTab("suggested")}
              >
                Nearby
              </button>
              <button
                type="button"
                className={tab === "saved" ? "is-on" : ""}
                aria-pressed={tab === "saved"}
                onClick={() => setTab("saved")}
              >
                Saved
              </button>
            </div>
          </div>
          {loading && <div className="loading-bar" aria-hidden />}
          {notice && <p className="notice">{notice}</p>}
          {!loading && visibleGyms.length === 0 && tab === "suggested" && notice && (
            <p className="notice">No mapped gyms in this spot yet. Try a wider radius or another town.</p>
          )}
          <GymList
            gyms={visibleGyms}
            selectedId={selectedId}
            favorites={favorites}
            emptyMessage={
              tab === "saved"
                ? "Save a gym from Nearby and it will live here."
                : "Search a town, estate, or county — try Webuye or Kilimani."
            }
            onSelect={selectGym}
            onToggleSave={toggleSave}
          />
          <p className="osm-credit">Map data © OpenStreetMap · basemap Esri</p>
        </div>
      )}
    </>
  );

  return (
    <div className={`app-shell ${sheetMode === "onboarding" ? "app-shell--onboarding" : ""}`}>
      <div className="map-stage">
        <MapView
          origin={origin}
          gyms={visibleGyms}
          selectedId={selectedId}
          onSelect={selectGym}
          onIdleCenter={onIdleCenter}
        />
      </div>

      <header className="chrome">
        <div className="chrome__brand">
          <span className="chrome__mark">KAYA</span>
          <span className="chrome__tag">Kenya gym map</span>
        </div>
        <div className="chrome__search">
          <PlaceSearch
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onSelectPlace={(place) => void goToPlace(place)}
          />
        </div>
        <div className="chrome__actions">
          <button
            type="button"
            className="tool-btn"
            onClick={() => {
              setSheetMode("filters");
              setSheetSize("full");
            }}
          >
            Filters
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => {
              setSheetMode("profile");
              setSheetSize("full");
            }}
          >
            Brief
          </button>
          <button type="button" className="tool-btn tool-btn--accent" onClick={locateMe}>
            Near me
          </button>
        </div>
        <div className="chrome__install">
          <InstallPrompt />
        </div>
      </header>

      {showSearchArea && (
        <button
          type="button"
          className="area-btn"
          onClick={() => void loadNearby(mapCenter, filters.radiusMeters, "Updated for this area")}
        >
          Search this area
        </button>
      )}

      <aside
        className={`panel panel--${sheetSize} ${sheetMode === "onboarding" ? "panel--immersive" : ""}`}
      >
        {sheetMode !== "onboarding" && (
          <button
            type="button"
            className="panel__handle"
            aria-label="Resize panel"
            onClick={() =>
              setSheetSize((current) =>
                current === "peek" ? "half" : current === "half" ? "full" : "peek",
              )
            }
          >
            <span />
          </button>
        )}
        <div className="panel__scroll">{panelBody}</div>
      </aside>
    </div>
  );
}
