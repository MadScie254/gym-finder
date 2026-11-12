// Pure recommendation logic for the Fuel demo. No I/O, no clock reads:
// callers pass `now`, so tests pin the time.
import { haversineKm } from "../../lib/kenya";
import { nairobiNow, parseClock } from "../../lib/nairobi";
import type { PlanSession, PlanSettings, PlanWeek } from "../../lib/planner";
import { currentWeek } from "../plan/planStore";
import type { DemoItem, DemoStore } from "./types";

export type LatLng = { lat: number; lng: number };

/**
 * later: a session today, more than three hours away. before: within three hours.
 * after: the session has started or finished. rest: no session today.
 */
export type Phase = "later" | "before" | "after" | "rest";

export type DaySlot = "morning" | "midday" | "afternoon" | "evening" | "late";

export type ReasonCode =
  | "after-protein" | "after-refuel" | "before-light" | "breakfast-training" | "breakfast-rest"
  | "goal-strength" | "goal-endurance" | "vegetarian-protein" | "budget" | "cook-at-home" | "balanced";

export type Pick = { store: DemoStore; item: DemoItem; score: number; reason: ReasonCode };
export type RankedStore = { store: DemoStore; fit: number; distanceKm: number | null };

export type Guidance = {
  phase: Phase;
  slot: DaySlot;
  /** Today's session from the plan, if any. */
  session: PlanSession | null;
  /** "18:00", only on a training day. */
  sessionTime: string | null;
};

export type RecommendInput = {
  settings: PlanSettings;
  now: Date;
  /** Today's session, from todaySession(). */
  session: PlanSession | null;
  sessionTime: string;
  town: string | null;
  origin?: LatLng | null;
  stores: DemoStore[];
};

export type Recommendation = {
  guidance: Guidance;
  town: string | null;
  picks: Pick[];
  stores: RankedStore[];
};

export function daySlot(hour: number): DaySlot {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "midday";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "late";
}

/** Today's session in the week the user is on (the first week with an unticked session). */
export function todaySession(weeks: PlanWeek[], done: string[], now: Date): PlanSession | null {
  const { weekday } = nairobiNow(now);
  return currentWeek(weeks, done).sessions.find((session) => session.day === weekday) ?? null;
}

export function phaseFor(session: PlanSession | null, sessionTime: string, now: Date): Phase {
  if (!session) return "rest";
  const { hour, minute } = nairobiNow(now);
  const start = parseClock(sessionTime) ?? 18 * 60;
  const nowMinutes = hour * 60 + minute;
  if (nowMinutes >= start) return "after";
  return start - nowMinutes <= 180 ? "before" : "later";
}

type Part = { points: number; reason: ReasonCode | null };

function slotPoints(item: DemoItem, slot: DaySlot): number {
  const table: Record<DaySlot, Partial<Record<DemoItem["meal"], number>>> = {
    morning: { breakfast: 3, drink: 1, main: -1 },
    midday: { main: 2, breakfast: -2 },
    afternoon: { snack: 1, drink: 1, breakfast: -2 },
    evening: { main: 2, breakfast: -2 },
    late: { snack: 1, drink: 1, breakfast: -2 },
  };
  return table[slot][item.meal] ?? 0;
}

export function scoreItem(item: DemoItem, settings: PlanSettings, guidance: Guidance): { score: number; reason: ReasonCode } {
  const tags = new Set(item.tags);
  const parts: Part[] = [{ points: slotPoints(item, guidance.slot), reason: null }];
  if (item.meal === "grocery") parts.push({ points: -1, reason: "cook-at-home" });
  if (guidance.phase === "after") {
    if (tags.has("high-protein") && tags.has("post-workout")) parts.push({ points: 5, reason: "after-protein" });
    else if (tags.has("high-protein")) parts.push({ points: 3, reason: "after-protein" });
    else if (tags.has("post-workout")) parts.push({ points: 3, reason: "after-refuel" });
  }
  if (guidance.phase === "before") {
    if (tags.has("pre-workout")) parts.push({ points: 3, reason: "before-light" });
    if ((item.kcal ?? 0) > 600) parts.push({ points: -2, reason: null });
  }
  if (item.meal === "breakfast" && guidance.slot === "morning") {
    parts.push({ points: 1, reason: guidance.phase === "rest" ? "breakfast-rest" : "breakfast-training" });
  }
  if ((guidance.phase === "rest" || guidance.phase === "later") && item.meal === "main") parts.push({ points: 1, reason: "balanced" });
  if (settings.goal === "strength" && tags.has("high-protein")) parts.push({ points: 2, reason: "goal-strength" });
  if (settings.goal === "endurance" && (tags.has("pre-workout") || (item.meal === "main" && (item.kcal ?? 0) >= 450))) {
    parts.push({ points: 1, reason: "goal-endurance" });
  }
  if (settings.diet === "vegetarian" && tags.has("high-protein")) parts.push({ points: 1.5, reason: "vegetarian-protein" });
  if (tags.has("budget")) parts.push({ points: 0.5, reason: "budget" });

  const score = parts.reduce((sum, part) => sum + part.points, 0);
  const best = parts.filter((part) => part.reason && part.points > 0).sort((a, b) => b.points - a.points)[0];
  const reason = item.meal === "grocery" ? "cook-at-home" : best?.reason ?? "balanced";
  return { score, reason };
}

/** Vegetarian settings never see meat: no butcheries, only items tagged vegetarian. */
export function eligibleItems(store: DemoStore, settings: PlanSettings): DemoItem[] {
  if (settings.diet !== "vegetarian") return store.items;
  if (store.kind === "butchery") return [];
  return store.items.filter((item) => item.tags.includes("vegetarian"));
}

function nearestTown(stores: DemoStore[], origin: LatLng): string | null {
  let best: { town: string; km: number } | null = null;
  for (const store of stores) {
    const km = haversineKm(origin, store.location);
    if (!best || km < best.km) best = { town: store.town, km };
  }
  return best?.town ?? null;
}

function selectPicks(scored: Pick[]): Pick[] {
  const ready = scored.filter((pick) => pick.item.meal !== "grocery").length;
  const groceryCap = ready >= 3 ? 1 : 5;
  const out: Pick[] = [];
  for (const storeCap of [2, 5]) {
    for (const pick of scored) {
      if (out.length >= 5 || out.includes(pick)) continue;
      if (pick.score <= 0 && out.length >= 3) continue;
      if (out.filter((p) => p.store.id === pick.store.id).length >= storeCap) continue;
      if (pick.item.meal === "grocery" && out.filter((p) => p.item.meal === "grocery").length >= groceryCap) continue;
      out.push(pick);
    }
    if (out.length >= 3) break;
  }
  return out;
}

export function recommend(input: RecommendInput): Recommendation {
  const { settings, now, session, sessionTime, origin, stores } = input;
  const slot = daySlot(nairobiNow(now).hour);
  const phase = phaseFor(session, sessionTime, now);
  const guidance: Guidance = { phase, slot, session, sessionTime: session ? sessionTime : null };
  const town = input.town ?? (origin ? nearestTown(stores, origin) : null);
  const local = stores.filter((store) => (town ? store.town === town : true));

  const scored: Pick[] = local
    .flatMap((store) => eligibleItems(store, settings).map((item) => ({ store, item, ...scoreItem(item, settings, guidance) })))
    .sort((a, b) => b.score - a.score || a.item.priceKes - b.item.priceKes || a.item.id.localeCompare(b.item.id));

  const ranked: RankedStore[] = local
    .filter((store) => eligibleItems(store, settings).length > 0)
    .map((store) => ({
      store,
      // Whole numbers on purpose, so stores that fit equally well are then ordered by distance.
      fit: Math.min(3, scored.filter((pick) => pick.store.id === store.id && pick.score >= 3).length),
      distanceKm: origin ? haversineKm(origin, store.location) : null,
    }))
    .sort((a, b) => b.fit - a.fit
      || (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      || a.store.name.localeCompare(b.store.name));

  return { guidance, town, picks: selectPicks(scored), stores: ranked };
}
