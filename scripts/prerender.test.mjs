import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
import { foldPlace as appFoldPlace } from "../src/lib/filterVenues";
import { slugify as appSlugify } from "../src/lib/slug";
import { buildPlacePages, foldPlace, slugify } from "./prerender-places.mjs";

const SCRIPT = fileURLToPath(new URL("./prerender.mjs", import.meta.url));
const tempDirs = [];

function gym(overrides) {
  return {
    id: overrides.slug, aliases: [], kind: "gym", lat: -1.28, lng: 36.82, area: null, town: null, county: "Nairobi",
    address: null, phones: [], whatsapp: null, website: null, instagram: null, facebook: null, hours: null, fee: null,
    amenities: {}, provenance: {}, osmUrl: null,
    trust: { tier: "listed", score: 0, reasons: ["Mapped in OpenStreetMap"], sources: ["osm"], lastSeen: null, stale: false, verifiedAt: null },
    ...overrides,
  };
}

function prerender(gyms, env = { SITE_URL: "https://example.test" }) {
  const dist = mkdtempSync(path.join(tmpdir(), "fmg-prerender-"));
  tempDirs.push(dist);
  mkdirSync(path.join(dist, "data"));
  writeFileSync(path.join(dist, "index.html"), '<!doctype html><html><head><meta name="description" content="Home" /><title>Home</title></head><body><div id="root"></div></body></html>');
  writeFileSync(path.join(dist, "data", "manifest.json"), JSON.stringify({ gymsPath: "/data/gyms.json" }));
  writeFileSync(path.join(dist, "data", "gyms.json"), JSON.stringify({ gyms }));
  const run = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env: { ...process.env, SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "", ...env, PRERENDER_DIST: dist } });
  expect(run.status, run.stderr).toBe(0);
  return dist;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it("generates crawlable gym content and absolute canonical and sitemap URLs safely", () => {
  const dist = mkdtempSync(path.join(tmpdir(), "fmg-prerender-"));
  tempDirs.push(dist);
  mkdirSync(path.join(dist, "data"));
  writeFileSync(path.join(dist, "index.html"), '<!doctype html><html><head><meta name="description" content="Home" /><title>Home</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
  writeFileSync(path.join(dist, "data", "manifest.json"), JSON.stringify({ gymsPath: "/data/gyms.json" }));
  writeFileSync(path.join(dist, "data", "gyms.json"), JSON.stringify({ gyms: [{
    id: "one", slug: "one", aliases: [], name: 'Gym </script><script>alert("x")</script>', kind: "gym",
    lat: -1.28, lng: 36.82, area: "Central", town: "Nairobi", county: "Nairobi", address: null,
    phones: [], whatsapp: null, website: null, instagram: null, facebook: null, hours: null, fee: null,
    amenities: {}, trust: { tier: "listed", score: 0, reasons: ["Mapped in OpenStreetMap"], sources: ["osm"], lastSeen: null, stale: false, verifiedAt: null },
    provenance: {}, osmUrl: null,
  }] }));

  const run = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, PRERENDER_DIST: dist, SITE_URL: "https://example.test" },
  });
  expect(run.status, run.stderr).toBe(0);
  const html = readFileSync(path.join(dist, "gym", "one", "index.html"), "utf8");
  expect(html).toContain('<link rel="canonical" href="https://example.test/gym/one/"');
  expect(html).toContain('<div id="root"><main');
  expect(html).toContain("Gym &lt;/script&gt;&lt;script&gt;alert");
  expect(html).not.toContain('</script><script>alert("x")');
  expect(html).toContain("\\u003c/script\\u003e");
  const sitemap = readFileSync(path.join(dist, "sitemap.xml"), "utf8");
  expect(sitemap).toContain("<loc>https://example.test/gym/one/</loc>");
  expect(sitemap).toContain("<loc>https://example.test/</loc>");
});

it("keeps its slug and place-name copies in step with the app's", () => {
  for (const name of ["Kilimani", "Murang'a", "Murang’a", "Taita-Taveta", "Nairobi  West", "Kîtengela", "St. Mary’s", "Elgeyo-Marakwet", " Ruiru "]) {
    expect(slugify(name), name).toBe(appSlugify(name));
    expect(foldPlace(name), name).toBe(appFoldPlace(name));
  }
});

it("lists only shown gyms on a place or county page, best evidence first", () => {
  const pages = buildPlacePages([
    gym({ slug: "b-gym", name: "B Gym", area: "Milimani", town: "Kisumu", county: "Kisumu", trust: { tier: "listed" } }),
    gym({ slug: "a-gym", name: "A Gym", area: "Milimani", town: "Kisumu", county: "Kisumu", trust: { tier: "verified" } }),
    gym({ slug: "hidden", name: "Hidden Gym", area: "Ruiru", town: "Ruiru", county: "Kiambu", trust: { tier: "unconfirmed" } }),
    gym({ slug: "border", name: "Border Gym", area: "Kisumu Road", town: "Kisumu", county: "Kiambu" }),
  ]);
  expect(pages.map((page) => page.path)).toEqual(["/county/kiambu/", "/county/kisumu/", "/in/kisumu-road/", "/in/milimani/"]);
  // A town named "Kisumu" in Kiambu county is not in Kisumu county, as the app's county page agrees.
  expect(pages[1].gyms.map((item) => item.slug)).toEqual(["a-gym", "b-gym"]);
  expect(pages[1].gyms.map((item) => item.slug)).toEqual(["a-gym", "b-gym"]);
  expect(JSON.stringify(pages)).not.toContain("hidden");
});

it("writes crawlable county and place pages and adds them to the sitemap", () => {
  const dist = prerender([
    gym({ slug: "one", name: "One Gym", area: "Milimani", town: "Kisumu", county: "Kisumu", phones: ["+254700000001"] }),
    gym({ slug: "two", name: "Two Gym", area: "Kenol", town: "Kenol", county: "Murang'a" }),
    gym({ slug: "weird", name: "A$&B Gym", area: "Milimani", town: "Kisumu", county: "Kisumu" }),
    gym({ slug: "hidden", name: "Hidden Gym", area: "Ruiru", town: "Ruiru", county: "Kiambu", trust: { tier: "unconfirmed" } }),
  ]);
  const county = readFileSync(path.join(dist, "county", "kisumu", "index.html"), "utf8");
  expect(county).toContain('<link rel="canonical" href="https://example.test/county/kisumu/"');
  expect(county).toContain("<h1>Gyms in Kisumu County</h1>");
  expect(county).toContain('<a href="/gym/one/">One Gym</a>');
  expect(county).toContain("<title>Gyms in Kisumu County, Kenya — Find My Gym</title>");
  expect(county).toContain("2 gyms listed in Kisumu County, 1 with a phone number.");
  expect(county).toContain('"@type":"ItemList"');
  expect(county).toContain("A$&amp;B Gym");

  const place = readFileSync(path.join(dist, "in", "milimani", "index.html"), "utf8");
  expect(place).toContain("<h1>Gyms in Milimani</h1>");
  expect(place).toContain('href="https://example.test/in/milimani/"');

  expect(readFileSync(path.join(dist, "county", "muranga", "index.html"), "utf8")).toContain("<h1>Gyms in Murang&#39;a County</h1>");
  expect(() => readFileSync(path.join(dist, "county", "kiambu", "index.html"))).toThrow();
  expect(() => readFileSync(path.join(dist, "in", "ruiru", "index.html"))).toThrow();

  const sitemap = readFileSync(path.join(dist, "sitemap.xml"), "utf8");
  for (const loc of ["/county/kisumu/", "/county/muranga/", "/in/milimani/", "/in/kenol/"]) expect(sitemap).toContain(`<loc>https://example.test${loc}</loc>`);
  expect(sitemap).not.toContain("ruiru");
});

it("takes the site address from SITE_URL, then the Vercel production domain, and never invents one", () => {
  const gyms = [gym({ slug: "one", name: "One Gym", area: "Central", town: "Nairobi", county: "Nairobi" })];
  const read = (dist, file) => readFileSync(path.join(dist, file), "utf8");

  const vercel = prerender(gyms, { VERCEL_PROJECT_PRODUCTION_URL: "gym.example.test" });
  expect(read(vercel, "gym/one/index.html")).toContain('<link rel="canonical" href="https://gym.example.test/gym/one/"');
  expect(read(vercel, "robots.txt")).toContain("Sitemap: https://gym.example.test/sitemap.xml");

  const explicit = prerender(gyms, { SITE_URL: "https://www.example.test", VERCEL_PROJECT_PRODUCTION_URL: "gym.example.test" });
  expect(read(explicit, "sitemap.xml")).toContain("<loc>https://www.example.test/gym/one/</loc>");

  const local = prerender(gyms, {});
  expect(read(local, "gym/one/index.html")).toContain('href="http://localhost:4173/gym/one/"');
  expect(read(local, "robots.txt")).not.toContain("findmygym");
});
