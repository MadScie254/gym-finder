import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Venue } from "../data/types";
import { loadCompare, storeCompare, toggleCompare } from "../lib/compare";
import { loadSaved, mergeImport, moveSaved, setNote, storeSaved, toggleSaved, type SavedEntry } from "../lib/saved";

type SavedValue = {
  entries: SavedEntry[];
  isSaved: (id: string) => boolean;
  toggle: (venue: Venue) => void;
  move: (id: string, delta: -1 | 1) => void;
  note: (id: string, text: string) => void;
  /** Add entries (import, shared list). Returns how many were new. */
  add: (incoming: SavedEntry[]) => number;
};

type CompareValue = {
  ids: string[];
  has: (id: string) => boolean;
  /** False when the list is full, so the caller can say why nothing happened. */
  toggle: (id: string) => boolean;
  set: (ids: string[]) => void;
  clear: () => void;
};

const SavedContext = createContext<SavedValue | null>(null);
const CompareContext = createContext<CompareValue | null>(null);

/** Saved gyms and the compare list, both kept in this browser and shared by every screen. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<SavedEntry[]>(() => loadSaved());
  const [ids, setIds] = useState<string[]>(() => loadCompare());

  useEffect(() => { storeSaved(entries); }, [entries]);
  useEffect(() => { storeCompare(ids); }, [ids]);

  // Another tab saving a gym updates this one too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "fmg-saved-v2") setEntries(loadSaved());
      if (event.key === "fmg-compare-v1") setIds(loadCompare());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((incoming: SavedEntry[]) => {
    const next = mergeImport(entries, incoming);
    setEntries(next);
    return next.length - entries.length;
  }, [entries]);

  const saved = useMemo<SavedValue>(() => ({
    entries,
    isSaved: (id) => entries.some((entry) => entry.id === id),
    toggle: (venue) => setEntries((current) => toggleSaved(current, venue)),
    move: (id, delta) => setEntries((current) => moveSaved(current, id, delta)),
    note: (id, text) => setEntries((current) => setNote(current, id, text)),
    add,
  }), [entries, add]);

  const compare = useMemo<CompareValue>(() => ({
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => {
      const result = toggleCompare(ids, id);
      if (!result.refused) setIds(result.ids);
      return !result.refused;
    },
    set: (next) => setIds(next.slice(0, 3)),
    clear: () => setIds([]),
  }), [ids]);

  return (
    <SavedContext.Provider value={saved}>
      <CompareContext.Provider value={compare}>{children}</CompareContext.Provider>
    </SavedContext.Provider>
  );
}

export function useSaved(): SavedValue {
  const value = useContext(SavedContext);
  if (!value) throw new Error("useSaved outside StoreProvider");
  return value;
}

export function useCompare(): CompareValue {
  const value = useContext(CompareContext);
  if (!value) throw new Error("useCompare outside StoreProvider");
  return value;
}

/** For components that also render outside the app shell (tests, prerender): null without a provider. */
export function useSavedMaybe(): SavedValue | null {
  return useContext(SavedContext);
}

export function useCompareMaybe(): CompareValue | null {
  return useContext(CompareContext);
}
