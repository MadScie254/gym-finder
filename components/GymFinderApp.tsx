"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CountySearch from "./CountySearch";
import FilterSheet from "./FilterSheet";
import GymDetail from "./GymDetail";
import GymList from "./GymList";
import InstallPrompt from "./InstallPrompt";
import MapView from "./MapView";
import ProfileForm from "./ProfileForm";
import { findCounty, haversineKm, isInKenya, NAIROBI } from "@/lib/kenya";
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

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

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
  const [demo, setDemo] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>("list");
  const [sheetSize, setSheetSize] = useState<SheetSize>("half");
  const [tab, setTab] = useState<ListTab>("suggested");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setFavorites(loadFavorites());
    if (!hasOnboarded()) {
      setSheetMode("onboarding");
      setSheetSize("full");
    }
    setReady(true);
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
  const showSearchArea = haversineKm(origin, mapCenter) > 0.45;

  const loadNearby = useCallback(async (center: LatLng, radiusMeters: number, label?: string) => {
    setLoading(true);
    setNotice(label ?? null);
    try {
      const result = await fetchNearbyGyms(center, radiusMeters);
      setRawGyms(result.gyms);
      setDemo(result.demo);
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
    const locate = () => {
      if (!navigator.geolocation) {
        void loadNearby(NAIROBI, filters.radiusMeters);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          if (!isInKenya(point)) {
            void loadNearby(
              NAIROBI,
              filters.radiusMeters,
              "Your location is outside Kenya, so Nairobi is shown.",
            );
            return;
          }
          void loadNearby(point, filters.radiusMeters);
        },
        () => {
          void loadNearby(NAIROBI, filters.radiusMeters, "Using Nairobi until location is allowed.");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
    };
    locate();
    // Initial locate only; radius changes refetch below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!ready || loading) return;
    void loadNearby(origin, filters.radiusMeters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.radiusMeters]);

  useEffect(() => {
    if (!selectedId || selectedId.startsWith("demo-")) return;
    let cancelled = false;
    setDetailsLoading(true);
    fetchGymDetails(selectedId)
      .then((details) => {
        if (cancelled) return;
        setRawGyms((current) =>
          current.map((gym) => (gym.id === details.id ? { ...gym, ...details } : gym)),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const onIdleCenter = useCallback((center: LatLng) => {
    setMapCenter(center);
  }, []);

  const selectGym = (id: string) => {
    setSelectedId(id);
    setSheetMode("detail");
    setSheetSize("full");
  };

  const toggleSave = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      saveFavorites(next);
      return next;
    });
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
      setDemo(result.demo);
      setSelectedId(null);
      setTab("suggested");
      setSheetMode("list");
      setSheetSize("half");
      setNotice(`Results for “${trimmed}”`);
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

  const finishOnboarding = (skip: boolean) => {
    if (!skip) saveProfile(profile);
    markOnboarded();
    setSheetMode("list");
    setSheetSize("half");
  };

  const saveProfileAndClose = () => {
    saveProfile(profile);
    setSheetMode("list");
    setSheetSize("half");
  };

  const sheetHeight =
    sheetSize === "peek" ? "h-[210px]" : sheetSize === "half" ? "h-[48%]" : "h-[86%]";

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b0f14] text-white">
      <div className="absolute inset-0">
        <MapView
          apiKey={MAPS_KEY}
          origin={origin}
          gyms={visibleGyms}
          selectedId={selectedId}
          onSelect={selectGym}
          onIdleCenter={onIdleCenter}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <CountySearch
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onSelectCounty={(name) => void handleSearch(name)}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSheetMode("filters");
                setSheetSize("full");
              }}
              className="rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur"
            >
              Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setSheetMode("profile");
                setSheetSize("full");
              }}
              className="rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition((position) => {
                  const point = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                  };
                  if (isInKenya(point)) {
                    void loadNearby(point, filters.radiusMeters);
                  } else {
                    setNotice("Location is outside Kenya.");
                  }
                });
              }}
              className="rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur"
            >
              Near me
            </button>
          </div>
          <div className="mt-2">
            <InstallPrompt />
          </div>
        </div>
      </div>

      {showSearchArea && sheetMode === "list" && (
        <div className="absolute inset-x-0 top-28 z-10 flex justify-center">
          <button
            type="button"
            onClick={() => void loadNearby(mapCenter, filters.radiusMeters, "Updated for this area")}
            className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black shadow-lg"
          >
            Search this area
          </button>
        </div>
      )}

      <section
        className={`absolute inset-x-0 bottom-0 z-30 mx-auto max-w-lg rounded-t-3xl border border-white/10 bg-[#10161ee6] shadow-[0_-12px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[height] ${sheetHeight}`}
      >
        <button
          type="button"
          className="flex w-full justify-center py-3"
          onClick={() =>
            setSheetSize((current) =>
              current === "peek" ? "half" : current === "half" ? "full" : "peek",
            )
          }
        >
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
        </button>

        <div className="h-[calc(100%-2.25rem)] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {sheetMode === "onboarding" && (
            <ProfileForm
              title="Find the right gym"
              subtitle="Tell us your goals, budget, and amenities. We will rank Google Maps gyms across Kenya for you. You can skip and still browse nearby."
              profile={profile}
              primaryLabel="Show suggestions"
              secondaryLabel="Skip for now"
              onChange={setProfile}
              onSubmit={() => finishOnboarding(false)}
              onSecondary={() => finishOnboarding(true)}
            />
          )}

          {sheetMode === "profile" && (
            <ProfileForm
              title="Your gym profile"
              subtitle="Suggestions update instantly from this profile. Nothing is stored on a server."
              profile={profile}
              primaryLabel="Save profile"
              secondaryLabel="Cancel"
              onChange={setProfile}
              onSubmit={saveProfileAndClose}
              onSecondary={() => {
                setSheetMode("list");
                setSheetSize("half");
              }}
            />
          )}

          {sheetMode === "filters" && (
            <FilterSheet
              filters={filters}
              onChange={setFilters}
              onClose={() => {
                setSheetMode("list");
                setSheetSize("half");
              }}
            />
          )}

          {sheetMode === "detail" && selectedGym && (
            <GymDetail
              gym={selectedGym}
              saved={favorites.includes(selectedGym.id)}
              loadingDetails={detailsLoading}
              onClose={() => {
                setSheetMode("list");
                setSheetSize("half");
              }}
              onToggleSave={() => toggleSave(selectedGym.id)}
            />
          )}

          {sheetMode === "list" && (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-lime-300">Kenya Gym Finder</p>
                  <h1 className="mt-1 text-xl font-semibold">
                    {loading
                      ? "Finding gyms…"
                      : `${visibleGyms.length} suggested gym${visibleGyms.length === 1 ? "" : "s"}`}
                  </h1>
                </div>
                <div className="flex rounded-full bg-white/10 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTab("suggested")}
                    className={`rounded-full px-3 py-1 ${tab === "suggested" ? "bg-lime-300 text-black" : "text-slate-300"}`}
                  >
                    Suggested
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("saved")}
                    className={`rounded-full px-3 py-1 ${tab === "saved" ? "bg-lime-300 text-black" : "text-slate-300"}`}
                  >
                    Saved
                  </button>
                </div>
              </div>
              {notice && <p className="mt-2 text-xs text-slate-400">{notice}</p>}
              {demo && (
                <p className="mt-2 rounded-xl bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
                  Demo data is showing. Add Google Maps API keys in `.env.local` for live gyms across
                  Kenya.
                </p>
              )}
              <div className="mt-4">
                <GymList
                  gyms={visibleGyms}
                  selectedId={selectedId}
                  favorites={favorites}
                  emptyMessage={
                    tab === "saved"
                      ? "Save gyms you like and they will appear here."
                      : "No gyms match these filters. Try a wider radius or another county."
                  }
                  onSelect={selectGym}
                  onToggleSave={toggleSave}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
