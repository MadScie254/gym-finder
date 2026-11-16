import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DeadLink, DeadLinkFile, deadLinkKey, dropDeadLinks, loadDeadLinks } from "./dead-links.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILE = path.join(ROOT, "data", "overrides", "dead-links.json");

const link = {
  id: "gers:one",
  field: "website" as const,
  url: "http://dead.example.test/",
  checkedAt: "2026-11-11",
  reason: "dead" as const,
  finding: "Domain does not resolve.",
};
const venue = {
  id: "gers:one",
  name: "One Gym",
  website: "http://dead.example.test/",
  instagram: "https://instagram.com/one",
  phones: ["+254700000001"],
  provenance: { website: "overture", instagram: "overture", phone: "osm" },
};

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("dead link schema", () => {
  it("accepts a dead, parked or different-business entry with a finding", () => {
    for (const reason of ["dead", "parked", "different_business"]) expect(DeadLink.safeParse({ ...link, reason }).success).toBe(true);
  });

  it("rejects an unknown reason, a non-URL, a bad date and a missing finding", () => {
    expect(DeadLink.safeParse({ ...link, reason: "slow" }).success).toBe(false);
    expect(DeadLink.safeParse({ ...link, url: "not a url" }).success).toBe(false);
    expect(DeadLink.safeParse({ ...link, checkedAt: "11 Nov 2026" }).success).toBe(false);
    expect(DeadLink.safeParse({ ...link, finding: "" }).success).toBe(false);
  });

  it("rejects two entries for the same venue and field", () => {
    expect(DeadLinkFile.safeParse({ links: [link, { ...link, url: "http://other.example.test/" }] }).success).toBe(false);
  });
});

describe("dropping dead links", () => {
  it("clears the website and its provenance and leaves every other field alone", () => {
    const matched = new Set<string>();
    const next = dropDeadLinks(venue, [link], matched);
    expect(next.website).toBeNull();
    expect(next.provenance).toEqual({ instagram: "overture", phone: "osm" });
    expect(next.instagram).toBe(venue.instagram);
    expect(next.phones).toEqual(venue.phones);
    expect([...matched]).toEqual([deadLinkKey(link)]);
    expect(venue.website).toBe("http://dead.example.test/");
  });

  it("keeps a website that is no longer the URL that was checked", () => {
    const matched = new Set<string>();
    const changed = { ...venue, website: "https://new.example.test/" };
    expect(dropDeadLinks(changed, [link], matched)).toBe(changed);
    expect(matched.size).toBe(0);
  });

  it("ignores entries for other venues", () => {
    expect(dropDeadLinks({ ...venue, id: "gers:two" }, [link]).website).toBe(venue.website);
  });
});

describe("dead link file", () => {
  it("loads no entries when the file does not exist", async () => {
    expect(await loadDeadLinks(path.join(ROOT, "data", "overrides", "no-such-file.json"))).toEqual([]);
  });

  it("fails loudly on a malformed file instead of shipping it", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "fmg-dead-"));
    tempDirs.push(dir);
    const file = path.join(dir, "dead-links.json");
    writeFileSync(file, JSON.stringify({ links: [{ ...link, reason: "slow" }] }));
    await expect(loadDeadLinks(file)).rejects.toThrow(/reason/);
  });

  it("is valid, and the committed catalogue carries none of its URLs", async () => {
    const links = await loadDeadLinks(FILE);
    expect(links.length).toBeGreaterThan(0);
    const manifest = JSON.parse(readFileSync(path.join(ROOT, "public", "data", "manifest.json"), "utf8"));
    const gyms = JSON.parse(readFileSync(path.join(ROOT, "public", "data", path.basename(manifest.gymsPath)), "utf8")).gyms;
    const byId = new Map<string, { website: string | null }>(gyms.map((gym: { id: string; website: string | null }) => [gym.id, gym]));
    for (const entry of links) expect(byId.get(entry.id)?.website, entry.id).not.toBe(entry.url);
  });
});
