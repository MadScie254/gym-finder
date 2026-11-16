import type { Venue } from "../data/types";

/** A saved gym keeps a copy of the listing, so it survives a catalogue refresh that drops or renames it. */
export type SavedEntry = { id: string; savedAt: string; note: string; snapshot: Venue };

export const SAVED_KEY = "fmg-saved-v2";
const LEGACY_KEY = "fmg-saved-venues-v1";
const MAX_NOTE = 500;
export const MAX_SAVED = 200;

type KeyValue = Pick<Storage, "getItem" | "setItem">;

function isVenue(value: unknown): value is Venue {
  if (!value || typeof value !== "object") return false;
  const venue = value as Venue;
  return typeof venue.id === "string" && typeof venue.slug === "string" && typeof venue.name === "string"
    && Number.isFinite(venue.lat) && Number.isFinite(venue.lng) && typeof venue.trust === "object" && venue.trust !== null;
}

function isEntry(value: unknown): value is SavedEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as SavedEntry;
  return typeof row.id === "string" && typeof row.savedAt === "string" && typeof row.note === "string" && isVenue(row.snapshot);
}

function dedupe(entries: SavedEntry[]): SavedEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => (seen.has(entry.id) ? false : (seen.add(entry.id), true))).slice(0, MAX_SAVED);
}

export function loadSaved(storage: KeyValue | null = typeof window !== "undefined" ? window.localStorage : null): SavedEntry[] {
  try {
    const raw = storage?.getItem(SAVED_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? dedupe(parsed.filter(isEntry)) : [];
    }
    // Version 1 stored bare venues. Move them over once, with no notes.
    const legacy: unknown = JSON.parse(storage?.getItem(LEGACY_KEY) ?? "[]");
    if (!Array.isArray(legacy)) return [];
    return dedupe(legacy.filter(isVenue).map((venue) => ({ id: venue.id, savedAt: new Date(0).toISOString(), note: "", snapshot: venue })));
  } catch {
    return [];
  }
}

export function storeSaved(entries: SavedEntry[], storage: KeyValue | null = typeof window !== "undefined" ? window.localStorage : null): void {
  try { storage?.setItem(SAVED_KEY, JSON.stringify(entries)); } catch { /* storage full or blocked */ }
}

export function toggleSaved(entries: SavedEntry[], venue: Venue, now = new Date()): SavedEntry[] {
  if (entries.some((entry) => entry.id === venue.id)) return entries.filter((entry) => entry.id !== venue.id);
  return dedupe([...entries, { id: venue.id, savedAt: now.toISOString(), note: "", snapshot: venue }]);
}

/** Move one entry up (-1) or down (+1). Out-of-range moves change nothing. */
export function moveSaved(entries: SavedEntry[], id: string, delta: -1 | 1): SavedEntry[] {
  const from = entries.findIndex((entry) => entry.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= entries.length) return entries;
  const next = [...entries];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function setNote(entries: SavedEntry[], id: string, note: string): SavedEntry[] {
  return entries.map((entry) => (entry.id === id ? { ...entry, note: note.slice(0, MAX_NOTE) } : entry));
}

/** Use the live listing when the catalogue still has it, else the copy saved with the entry. */
export function currentVenue(entry: SavedEntry, byId: ReadonlyMap<string, Venue> | null): { venue: Venue; gone: boolean } {
  const live = byId?.get(entry.id);
  if (live) return { venue: live, gone: false };
  return { venue: entry.snapshot, gone: byId != null };
}

export type SavedFile = { app: "find-my-gym"; version: 1; exportedAt: string; gyms: SavedEntry[] };

export function exportSaved(entries: SavedEntry[], now = new Date()): string {
  const file: SavedFile = { app: "find-my-gym", version: 1, exportedAt: now.toISOString(), gyms: entries };
  return JSON.stringify(file, null, 2);
}

/** Parse an exported file. Throws a plain-language Error when the file is not one of ours. */
export function parseImport(text: string): SavedEntry[] {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("not-json"); }
  const file = parsed as Partial<SavedFile>;
  if (!file || file.app !== "find-my-gym" || !Array.isArray(file.gyms)) throw new Error("not-ours");
  return dedupe(file.gyms.filter(isEntry).map((entry) => ({ ...entry, note: entry.note.slice(0, MAX_NOTE) })));
}

/** Imported entries are added after the current ones. A note already on this device wins. */
export function mergeImport(current: SavedEntry[], incoming: SavedEntry[]): SavedEntry[] {
  const ids = new Set(current.map((entry) => entry.id));
  return dedupe([...current, ...incoming.filter((entry) => !ids.has(entry.id))]);
}

/** A shareable link to the list. Ids only: notes stay private on this device. */
export function sharedListPath(entries: SavedEntry[]): string {
  return `/saved?list=${encodeURIComponent(entries.map((entry) => entry.id).join(","))}`;
}

export function parseIdList(value: string | null, max = MAX_SAVED): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter((id) => /^[\w:./-]{1,120}$/.test(id)))].slice(0, max);
}
