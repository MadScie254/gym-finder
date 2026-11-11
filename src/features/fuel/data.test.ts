import { describe, expect, it } from "vitest";
import { z } from "zod";
import places from "@data/kenya-places.json";
import demoFile from "@data/fuel/demo-stores.json";
import { haversineKm } from "../../lib/kenya";
import { DEMO_STORES, fuelMode } from "./data";

const TAGS = ["high-protein", "vegetarian", "post-workout", "pre-workout", "budget", "breakfast"] as const;
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const item = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(3),
  section: z.string().min(3),
  unit: z.string().min(1),
  priceKes: z.number().int().min(20).max(2000),
  proteinG: z.number().min(0).max(100).optional(),
  kcal: z.number().int().min(10).max(1200).optional(),
  tags: z.array(z.enum(TAGS)),
  meal: z.enum(["breakfast", "main", "snack", "drink", "grocery"]),
}).strict();

const store = z.object({
  id: z.string().regex(/^demo-[a-z0-9-]+$/),
  name: z.string().startsWith("Demo: "),
  kind: z.enum(["meal-prep", "smoothie-bar", "grocery", "butchery"]),
  area: z.string().min(2),
  town: z.enum(["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"]),
  location: z.object({ lat: z.number(), lng: z.number() }).strict(),
  placeId: z.string(),
  hours: z.array(z.object({ days: z.string(), open: time, close: time }).strict()).min(1),
  items: z.array(item).min(6).max(10),
}).strict();

const file = z.object({ note: z.string(), stores: z.array(store).min(8).max(14) }).strict();

// Words that would put meat or fish into a vegetarian pick.
const MEAT = /chicken|beef|goat|fish|tilapia|kingfish|omena|liver|mince|steak|nyama|pilau|biryani|octopus/i;
// Real brands must never carry invented menus or prices.
const REAL_BRANDS = /glovo|foodplus|chandarana|naivas|carrefour|quickmart|java|kfc|uber|bolt|jumia/i;

describe("demo store file", () => {
  it("matches the schema", () => {
    const result = file.safeParse(demoFile);
    expect(result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)).toEqual([]);
  });

  it("covers Nairobi areas and the four other towns", () => {
    const towns = new Set(DEMO_STORES.map((s) => s.town));
    expect([...towns].sort()).toEqual(["Eldoret", "Kisumu", "Mombasa", "Nairobi", "Nakuru"]);
    expect(new Set(DEMO_STORES.filter((s) => s.town === "Nairobi").map((s) => s.area)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(DEMO_STORES.map((s) => s.kind)).size).toBe(4);
  });

  it("places every store within 1 km of a real area centre", () => {
    for (const s of DEMO_STORES) {
      const centre = places.places.find((place) => place.id === s.placeId);
      expect(centre, s.id).toBeDefined();
      expect(haversineKm(s.location, centre!.location), s.id).toBeLessThan(1);
    }
  });

  it("uses unique ids for stores and items", () => {
    const ids = DEMO_STORES.flatMap((s) => [s.id, ...s.items.map((i) => i.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never tags meat or fish as vegetarian", () => {
    const bad = DEMO_STORES.flatMap((s) => s.items).filter((i) => i.tags.includes("vegetarian") && MEAT.test(i.name));
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it("tags high protein only at 20 g or more, or on raw groceries", () => {
    const bad = DEMO_STORES.flatMap((s) => s.items)
      .filter((i) => i.tags.includes("high-protein") && i.meal !== "grocery" && (i.proteinG ?? 0) < 20);
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it("names no real brand", () => {
    expect(JSON.stringify(demoFile)).not.toMatch(REAL_BRANDS);
  });
});

describe("fuel mode", () => {
  it("defaults to demo and only goes live when asked", () => {
    expect(fuelMode({})).toBe("demo");
    expect(fuelMode({ VITE_FUEL_MODE: "nonsense" })).toBe("demo");
    expect(fuelMode({ VITE_FUEL_MODE: "live" })).toBe("live");
  });
});
