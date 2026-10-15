import { describe, expect, it } from "vitest";
import { COUNTIES } from "./geo.mjs";
import { contentHash } from "./publish.mjs";
import { checkBuild } from "./validate.mjs";

type Venue = Record<string, any>;
const venue = (i: number, over: Venue = {}): Venue => ({
  id: `osm:node/${1000 + i}`,
  slug: `test-gym-${(0x1000 + i).toString(16)}`,
  aliases: [],
  name: `Test Gym ${i}`,
  kind: "gym",
  lat: -1.29 + (i % 40) * 0.001,
  lng: 36.8 + Math.floor(i / 40) * 0.001,
  area: null, town: "Nairobi", county: "Nairobi", address: null,
  phones: [], whatsapp: null, website: null, instagram: null, facebook: null,
  hours: null, fee: null, amenities: {},
  trust: { tier: "listed", score: 40, reasons: ["Mapped in OpenStreetMap"], sources: ["osm"], lastSeen: null, stale: false, verifiedAt: null },
  provenance: { name: "osm", location: "osm" },
  osmUrl: null,
  ...over,
});

const NOTICE = "OpenStreetMap Overture CDLA-Permissive-2.0 Foursquare Apache-2.0 GeoNames CC0";
function build(venues: Venue[], tweak: (ctx: any) => void = () => {}) {
  const gymsText = JSON.stringify({ gyms: venues });
  const gymsFile = `gyms.${contentHash(gymsText)}.json`;
  const visible = venues.filter((v) => v.trust.tier !== "unconfirmed").length;
  const byTier: Record<string, number> = {};
  const byCounty = Object.fromEntries(COUNTIES.map((c) => [c.name, 0]));
  for (const v of venues) {
    byTier[v.trust.tier] = (byTier[v.trust.tier] ?? 0) + 1;
    if (v.county) byCounty[v.county] += 1;
  }
  const ctx = {
    manifest: {
      builtAt: "2026-10-13T00:00:00.000Z",
      counts: { total: venues.length, defaultVisible: visible, byTier, byCounty },
      licenses: ["ODbL-1.0", "CDLA-Permissive-2.0", "Apache-2.0: Foursquare", "CC BY 4.0: GeoNames"],
      notices: ["n"],
      gymsPath: `/data/${gymsFile}`,
      previous: null,
    } as Record<string, any>,
    gymsText,
    gymsFile,
    landmarksText: JSON.stringify({ landmarks: [{ id: "l:1", name: "Yaya Centre", kind: "shopping_mall", lat: -1.2935, lng: 36.7871 }] }),
    otherHashed: [] as string[],
    overrides: { venues: new Map() },
    files: { "LICENSE-DATA.md": NOTICE, NOTICE },
    env: {},
  };
  tweak(ctx);
  if (ctx.gymsText !== gymsText) ctx.gymsFile = `gyms.${contentHash(ctx.gymsText)}.json`, ctx.manifest.gymsPath = `/data/${ctx.gymsFile}`;
  return checkBuild(ctx).errors;
}

const good = () => Array.from({ length: 360 }, (_, i) => venue(i));
const withEdit = (index: number, over: Venue) => good().map((v, i) => (i === index ? { ...v, ...over } : v));

describe("validation gates", () => {
  it("a healthy build passes", () => {
    expect(build(good())).toEqual([]);
  });

  const trips: [string, () => string[], RegExp][] = [
    ['address "Kenya"', () => build(withEdit(0, { address: "Kenya" })), /address/],
    ["a social URL as the website", () => build(withEdit(0, { website: "https://www.facebook.com/x" })), /website/],
    ["an Instagram link that is not Instagram", () => build(withEdit(0, { instagram: "https://example.com/x" })), /instagram/],
    ["javascript: in a URL", () => build(withEdit(0, { website: "javascript:alert(1)" })), /website/],
    ["a phone that is not E.164 +254", () => build(withEdit(0, { phones: ["0722784664"] })), /phones/],
    ["a venue outside the Kenya polygon", () => build(withEdit(0, { lat: -6.8, lng: 39.2 })), /polygon/],
    ["a duplicate slug", () => build(withEdit(1, { slug: good()[0].slug })), /duplicate slug/],
    ["a duplicate id", () => build(withEdit(1, { id: good()[0].id })), /duplicate id/],
    ["an alias equal to another venue's id", () => build(withEdit(0, { aliases: [good()[1].id] })), /alias .* is also a venue id/],
    ["fewer than 350 default-visible venues", () => build(good().slice(0, 349)), /default-visible 349 < 350/],
    ["Nairobi below 150", () => build(good().map((v, i) => (i < 220 ? { ...v, county: "Kiambu" } : v))), /Nairobi default-visible 140 < 150/],
    ["unconfirmed venues not counted as visible", () => build(good().map((v, i) => (i < 20 ? { ...v, trust: { ...v.trust, tier: "unconfirmed" } } : v))), /default-visible 340 < 350/],
    ["a county outside COUNTIES", () => build(withEdit(0, { county: "Atlantis" })), /county/],
    ["verified with no override file", () => build(withEdit(0, { trust: { ...good()[0].trust, tier: "verified", verifiedAt: "2026-09-01" } })), /no data\/overrides\/venues file/],
    ["verified older than 12 months", () => build(withEdit(0, { trust: { ...good()[0].trust, tier: "verified", verifiedAt: "2025-01-01" } })), /older than 12 months/],
    ['the word "verified" on a listed venue', () => build(withEdit(0, { trust: { ...good()[0].trust, reasons: ["Verified by someone"] } })), /verified/],
    ["a web-only venue above listed", () => build(withEdit(0, { trust: { ...good()[0].trust, tier: "corroborated", sources: ["web"] } })), /web-research only/],
    ["a stale hashed gyms file left behind", () => build(good(), (c) => { c.otherHashed = ["gyms.0000000000.json"]; }), /stale hashed/],
    ["a gyms file whose name does not match its content", () => build(good(), (c) => { c.gymsFile = "gyms.abcdef0123.json"; c.manifest.gymsPath = "/data/gyms.abcdef0123.json"; }), /content hash/],
    ["manifest counts that disagree with the data", () => build(good(), (c) => { c.manifest.counts.total = 999; }), /manifest total/],
    ["a county missing from the manifest", () => build(good(), (c) => { delete c.manifest.counts.byCounty.Turkana; }), /Turkana missing/],
    ["more than 15% below the previous build", () => build(good(), (c) => { c.manifest.previous = { defaultVisible: 430, total: 450 }; }), /15% below the previous/],
    ["a total more than 15% below the previous build", () => build(good(), (c) => { c.manifest.previous = { defaultVisible: 400, total: 900 }; }), /total 360 is more than 15% below the previous build \(900\)/],
    ["a field the Venue type does not have (e.g. a rating)", () => build(withEdit(0, { rating: 4.5 })), /rating|Unrecognized/i],
    ["more than 15% below PREVIOUS_TOTAL", () => build(good(), (c) => { c.env = { PREVIOUS_TOTAL: "500" }; }), /PREVIOUS_TOTAL/],
    ["missing licences in the manifest", () => build(good(), (c) => { c.manifest.licenses = []; }), /no licenses/],
    ["a licence the data needs missing from the manifest", () => build(good(), (c) => { c.manifest.licenses = ["ODbL-1.0"]; }), /CDLA/],
    ["NOTICE without the Foursquare text", () => build(good(), (c) => { c.files.NOTICE = "OpenStreetMap Overture CDLA GeoNames"; }), /NOTICE does not mention Foursquare/],
    ["no landmarks", () => build(good(), (c) => { c.landmarksText = JSON.stringify({ landmarks: [] }); }), /landmarks/],
  ];
  for (const [label, run, message] of trips) {
    it(`fails on ${label}`, () => {
      const errors = run();
      expect(errors.length, label).toBeGreaterThan(0);
      expect(errors.join("\n"), label).toMatch(message);
    });
  }

  it("a 10% drop from the previous build is allowed", () => {
    expect(build(good(), (c) => { c.manifest.previous = { defaultVisible: 395, total: 395 }; })).toEqual([]);
  });

  it("a verified venue passes only with a matching, fresh override", () => {
    const verified = withEdit(0, { trust: { ...good()[0].trust, tier: "verified", verifiedAt: "2026-09-01", reasons: ["Confirmed by Find My Gym on 1 Sep 2026"] } });
    const errors = build(verified, (c) => { c.overrides = { venues: new Map([["osm:node/1000", { id: "osm:node/1000", verifiedAt: "2026-09-01", verification: "phone" }]]) }; });
    expect(errors).toEqual([]);
  });
});
