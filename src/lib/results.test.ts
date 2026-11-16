import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createVenueSearch, type VenueIndex } from "../data/loadVenues";
import type { DataManifest, Venue } from "../data/types";
import { t } from "./i18n";
import { prepareLandmarks } from "./landmarks";
import { computeResults, countWith } from "./results";
import { buildSuggestions } from "./searchModel";
import { NO_FILTERS } from "./urlState";

const manifest = JSON.parse(readFileSync(new URL("../../public/data/manifest.json", import.meta.url), "utf8")) as DataManifest;
const venues = JSON.parse(readFileSync(new URL(`../../public${manifest.gymsPath}`, import.meta.url), "utf8")).gyms as Venue[];
const index: VenueIndex = {
  manifest, venues, search: createVenueSearch(venues), builtMs: 0,
  byId: new Map(venues.map((v) => [v.id, v])), bySlug: new Map(venues.map((v) => [v.slug, v])),
};
const landmarks = prepareLandmarks(JSON.parse(readFileSync(new URL("../../public/data/landmarks.json", import.meta.url), "utf8")).landmarks);
const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t("en", key, vars);
const westlands = { lat: -1.2676, lng: 36.8108 };

describe("results", () => {
  it("hides unconfirmed listings from the default list", () => {
    const { list } = computeResults(index, { kind: "all" }, NO_FILTERS, null);
    expect(list.length).toBe(manifest.counts.defaultVisible);
    expect(list.every((v) => v.trust.tier !== "unconfirmed")).toBe(true);
  });

  it("sorts by trust without a location and by distance with one", () => {
    const byTrust = computeResults(index, { kind: "all" }, NO_FILTERS, null);
    expect(byTrust.sort).toBe("trust");
    expect(byTrust.list[0].trust.tier).toBe("verified");
    const near = computeResults(index, { kind: "all" }, NO_FILTERS, westlands);
    expect(near.sort).toBe("distance");
    expect(near.list[0].county).toBe("Nairobi");
  });

  it("never lists Kiambu gyms on the Kisumu page", () => {
    const { list } = computeResults(index, { kind: "place", name: "Kisumu", point: null }, NO_FILTERS, null);
    expect(list.length).toBeGreaterThan(3);
    expect(list.some((v) => v.county === "Kiambu")).toBe(false);
  });

  it("filters to a distance only when there is a reference point", () => {
    const filters = { ...NO_FILTERS, km: 2 as const };
    expect(computeResults(index, { kind: "all" }, filters, null).list.length).toBe(manifest.counts.defaultVisible);
    const near = computeResults(index, { kind: "all" }, filters, westlands).list;
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThan(80);
  });

  it("counts what each chip would leave", () => {
    const { base } = computeResults(index, { kind: "all" }, NO_FILTERS, null);
    const phones = countWith(base, NO_FILTERS, { phone: true }, null);
    expect(phones).toBe(base.filter((v) => v.phones.length > 0 || v.whatsapp).length);
    expect(countWith(base, NO_FILTERS, { trust: "verified" }, null)).toBe(manifest.counts.byTier.verified);
    expect(countWith(base, NO_FILTERS, { open: true }, null, new Date("2026-11-11T03:00:00+03:00"))).toBeLessThanOrEqual(10);
  });

  it("lists gyms near a landmark, measured from the landmark", () => {
    const sarit = landmarks.find((item) => item.slug === "sarit-centre")!;
    const result = computeResults(index, { kind: "landmark", landmark: sarit }, NO_FILTERS, null);
    expect(result.reference).toBe(sarit);
    expect(result.sort).toBe("distance");
    expect(result.list.length).toBeGreaterThan(3);
  });
});

describe("grouped search", () => {
  const groups = (query: string) => Object.fromEntries(
    buildSuggestions({ index, landmarks, query, recent: [], tr }).map((group) => [group.id, group.options.map((o) => o.label)]),
  );

  it("puts Salute Gym first for a typo", () => {
    expect(groups("slaute gym").gyms[0]).toBe("Salute Gym");
  });

  it("finds Sarit Centre as a landmark", () => {
    expect(groups("sarit").landmarks).toContain("Sarit Centre");
  });

  it("reads 'near yaya' as a place search, not a gym name search", () => {
    const result = groups("near yaya");
    expect(result.gyms).toEqual([]);
    expect(result.landmarks[0]).toBe("Yaya Centre");
  });

  it("offers Kisumu as an area and a county with gym counts", () => {
    const all = buildSuggestions({ index, landmarks, query: "kisumu", recent: [], tr });
    const area = all.find((g) => g.id === "areas")!.options[0];
    expect(area.label).toBe("Kisumu");
    expect(area.href).toBe("/in/kisumu");
    expect(area.hint).toMatch(/^Town, \d+ gyms$/);
    expect(all.find((g) => g.id === "counties")!.options[0].href).toBe("/county/kisumu");
  });

  it("shows recent searches when the field is empty", () => {
    const [recent] = buildSuggestions({ index, landmarks, query: "", recent: [{ label: "Westlands", href: "/in/westlands" }], tr });
    expect(recent.options).toEqual([{ id: "/in/westlands", label: "Westlands", href: "/in/westlands" }]);
  });
});
