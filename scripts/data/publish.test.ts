import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildLandmarks } from "./landmarks.mjs";
import { carrySlugs, contentHash, previousSummary, publishGyms } from "./publish.mjs";

const dirs: string[] = [];
afterEach(() => { while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true }); });

describe("publishing the hashed gyms file", () => {
  it("writes gyms.<contenthash>.json and deletes every stale hashed file", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "fmg-publish-"));
    dirs.push(dir);
    writeFileSync(path.join(dir, "gyms.aaaaaaaaaa.json"), "{}");
    writeFileSync(path.join(dir, "gyms.bbbbbbbbbb.json"), "{}");
    writeFileSync(path.join(dir, "manifest.json"), "{}");
    writeFileSync(path.join(dir, ".gitkeep"), "");
    const body = JSON.stringify({ gyms: [{ id: "x" }] });
    const name = await publishGyms(dir, body);
    expect(name).toBe(`gyms.${contentHash(body)}.json`);
    expect(readdirSync(dir).sort()).toEqual([".gitkeep", name, "manifest.json"].sort());
    expect(await publishGyms(dir, body)).toBe(name); // same input, same file, nothing else changes
    expect(existsSync(path.join(dir, name))).toBe(true);
  });

  it("the hash depends only on content", () => {
    expect(contentHash("a")).toBe(contentHash("a"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
    expect(contentHash("a")).toMatch(/^[0-9a-f]{10}$/);
  });
});

describe("old slugs", () => {
  const prev = (id: string, slug: string, aliases: string[] = []) => ({ id, slug, aliases });
  const now = (id: string, slug: string, aliases: string[] = []) => ({ id, slug, aliases });

  it("a renamed venue keeps its old slug as an alias", () => {
    const carried = carrySlugs({ gyms: [prev("osm:node/1", "old-name-1111")], manifest: {} }, [now("osm:node/1", "new-name-2222")]);
    expect(carried.get("osm:node/1")).toEqual(["old-name-1111"]);
  });

  it("a record merged into another passes its slug on to the survivor", () => {
    const carried = carrySlugs({ gyms: [prev("gers:a", "level-24-gym-1111")], manifest: {} }, [now("osm:node/1", "level-24-2222", ["gers:a"])]);
    expect(carried.get("osm:node/1")).toEqual(["level-24-gym-1111"]);
  });

  it("a slug can never belong to two venues: a split is not carried", () => {
    const carried = carrySlugs(
      { gyms: [prev("gers:a", "merged-1111", ["gers:b"])], manifest: {} },
      [now("osm:node/1", "one-2222", ["gers:a"]), now("osm:node/2", "two-3333", ["gers:a"])],
    );
    expect([...carried.values()].flat()).toEqual([]);
  });

  it("carries earlier slug aliases but never ids or names, and is stable on a second run", () => {
    const first = carrySlugs({ gyms: [prev("osm:node/1", "a-1111", ["gers:z", "Some Name", "older-0000"])], manifest: {} }, [now("osm:node/1", "b-2222")]);
    expect(first.get("osm:node/1")).toEqual(["a-1111", "older-0000"]);
    const second = carrySlugs({ gyms: [prev("osm:node/1", "b-2222", ["a-1111", "older-0000"])], manifest: {} }, [now("osm:node/1", "b-2222")]);
    expect(second.get("osm:node/1")).toEqual(["a-1111", "older-0000"]);
  });

  it("does not hand a venue a slug another venue now uses", () => {
    const carried = carrySlugs({ gyms: [prev("osm:node/1", "taken-1111")], manifest: {} }, [now("osm:node/1", "new-2222"), now("osm:node/2", "taken-1111")]);
    expect(carried.get("osm:node/1")).toEqual([]);
  });
});

describe("previous build summary", () => {
  it("records the last different build, and carries it forward on an identical rebuild", () => {
    const previous = { manifest: { gymsPath: "/data/gyms.1111111111.json", builtAt: "2026-09-01T00:00:00.000Z", counts: { total: 58, defaultVisible: 58 }, previous: { total: 10, defaultVisible: 10 } }, gyms: [] };
    expect(previousSummary(previous, "/data/gyms.2222222222.json")).toMatchObject({ total: 58, defaultVisible: 58 });
    expect(previousSummary(previous, "/data/gyms.1111111111.json")).toEqual({ total: 10, defaultVisible: 10 });
    expect(previousSummary(null, "/data/gyms.1.json")).toBeNull();
  });
});

describe("landmarks", () => {
  const row = (id: string, name: string, tax: string, confidence: number, lat = -1.2935, lng = 36.7871, country = "KE") => ({ id, name, tax, confidence, lat, lng, country });

  it("keeps malls at confidence >= 0.6, inside Kenya, de-duplicated, with short ids", () => {
    const { landmarks, counts } = buildLandmarks([
      row("aaaaaaaa-0000-4000-8000-000000000001", "Yaya Centre", "shopping_mall", 0.9),
      row("bbbbbbbb-0000-4000-8000-000000000002", "YAYA CENTRE", "shopping_mall", 0.7), // same place twice
      row("cccccccc-0000-4000-8000-000000000003", "Weak Mall", "shopping_mall", 0.59),
      row("dddddddd-0000-4000-8000-000000000004", "Dar Mall", "shopping_mall", 0.9, -6.8, 39.2),
      row("eeeeeeee-0000-4000-8000-000000000005", "Kampala Mall", "shopping_mall", 0.9, 0.3, 32.6, "UG"),
      row("ffffffff-0000-4000-8000-000000000006", "University of Nairobi", "college_university", 0.8, -1.2792, 36.8166),
      row("11111111-0000-4000-8000-000000000007", "Kasarani Stadium", "soccer_stadium", 0.8, -1.2196, 36.9046),
      row("22222222-0000-4000-8000-000000000008", "Machakos Bus Station", "bus_station", 0.8, -1.5177, 37.2634),
    ]);
    expect(landmarks.map((l) => l.name).sort()).toEqual(["Kasarani Stadium", "Machakos Bus Station", "University of Nairobi", "Yaya Centre"]);
    expect(counts).toEqual({ bus_station: 1, college_university: 1, shopping_mall: 1, stadium_arena: 1 });
    expect(landmarks[0].id).toMatch(/^l:[0-9a-f]{8}$/);
  });
});
