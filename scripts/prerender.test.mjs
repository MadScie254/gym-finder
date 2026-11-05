import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("./prerender.mjs", import.meta.url));
const tempDirs = [];

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
