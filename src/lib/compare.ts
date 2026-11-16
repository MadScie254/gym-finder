import { parseIdList } from "./saved";

export const MAX_COMPARE = 3;
const KEY = "fmg-compare-v1";

type KeyValue = Pick<Storage, "getItem" | "setItem">;

export function loadCompare(storage: KeyValue | null = typeof window !== "undefined" ? window.localStorage : null): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parseIdList(parsed.filter((id) => typeof id === "string").join(","), MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function storeCompare(ids: string[], storage: KeyValue | null = typeof window !== "undefined" ? window.localStorage : null): void {
  try { storage?.setItem(KEY, JSON.stringify(ids.slice(0, MAX_COMPARE))); } catch { /* storage blocked */ }
}

/** Add or remove. A fourth gym is refused: the caller says why rather than dropping one silently. */
export function toggleCompare(ids: string[], id: string): { ids: string[]; refused: boolean } {
  if (ids.includes(id)) return { ids: ids.filter((item) => item !== id), refused: false };
  if (ids.length >= MAX_COMPARE) return { ids, refused: true };
  return { ids: [...ids, id], refused: false };
}

export function comparePath(ids: string[]): string {
  return ids.length ? `/compare?ids=${encodeURIComponent(ids.join(","))}` : "/compare";
}

export function parseCompareIds(value: string | null): string[] {
  return parseIdList(value, MAX_COMPARE);
}
