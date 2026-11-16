/** The visitor's own first-visit notes per gym ("Contacted", "Visited"). Kept on this device; the app never books. */
export type VisitMarks = { contacted?: string; visited?: string };

const KEY = "fmg-visits-v1";
type KeyValue = Pick<Storage, "getItem" | "setItem">;

function store(): KeyValue | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function loadVisits(storage: KeyValue | null = store()): Record<string, VisitMarks> {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, VisitMarks> : {};
  } catch {
    return {};
  }
}

/** Flip one mark. Marking stores today's date; unmarking removes it. */
export function toggleVisit(id: string, mark: keyof VisitMarks, now = new Date(), storage: KeyValue | null = store()): VisitMarks {
  const all = loadVisits(storage);
  const current = { ...all[id] };
  if (current[mark]) delete current[mark];
  else current[mark] = now.toISOString().slice(0, 10);
  all[id] = current;
  try { storage?.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
  return current;
}
