import { describe, expect, it } from "vitest";
import type { Venue } from "../data/types";
import { toggleCompare } from "./compare";
import { currentVenue, exportSaved, loadSaved, mergeImport, moveSaved, parseIdList, parseImport, setNote, sharedListPath, toggleSaved } from "./saved";

function venue(id: string, name = id): Venue {
  return { id, slug: id, name, lat: -1.28, lng: 36.82, trust: { tier: "listed" } } as unknown as Venue;
}

const now = new Date("2026-11-11T09:00:00Z");

describe("saved gyms", () => {
  it("saves a snapshot and unsaves on a second tap", () => {
    const one = toggleSaved([], venue("a"), now);
    expect(one).toEqual([{ id: "a", savedAt: "2026-11-11T09:00:00.000Z", note: "", snapshot: venue("a") }]);
    expect(toggleSaved(one, venue("a"), now)).toEqual([]);
  });

  it("reorders, and ignores moves past either end", () => {
    const list = [venue("a"), venue("b"), venue("c")].reduce((acc, item) => toggleSaved(acc, item, now), [] as ReturnType<typeof toggleSaved>);
    expect(moveSaved(list, "c", -1).map((e) => e.id)).toEqual(["a", "c", "b"]);
    expect(moveSaved(list, "a", -1)).toBe(list);
    expect(moveSaved(list, "c", 1)).toBe(list);
  });

  it("keeps notes, capped at 500 characters", () => {
    const list = setNote(toggleSaved([], venue("a"), now), "a", "x".repeat(600));
    expect(list[0].note).toHaveLength(500);
  });

  it("falls back to the snapshot when the catalogue drops a gym", () => {
    const [entry] = toggleSaved([], venue("gone", "Old Name"), now);
    expect(currentVenue(entry, new Map())).toEqual({ venue: entry.snapshot, gone: true });
    const renamed = venue("gone", "New Name");
    expect(currentVenue(entry, new Map([["gone", renamed]]))).toEqual({ venue: renamed, gone: false });
    expect(currentVenue(entry, null).gone).toBe(false);
  });

  it("exports and imports a file, keeping notes already on this device", () => {
    const mine = setNote(toggleSaved([], venue("a"), now), "a", "mine");
    const file = exportSaved([...setNote(toggleSaved([], venue("a"), now), "a", "theirs"), ...toggleSaved([], venue("b"), now)], now);
    const merged = mergeImport(mine, parseImport(file));
    expect(merged.map((e) => [e.id, e.note])).toEqual([["a", "mine"], ["b", ""]]);
  });

  it("rejects files that are not exports", () => {
    expect(() => parseImport("not json")).toThrow("not-json");
    expect(() => parseImport(JSON.stringify({ gyms: [] }))).toThrow("not-ours");
  });

  it("migrates the version 1 list of bare venues", () => {
    const storage = { getItem: (key: string) => (key === "fmg-saved-venues-v1" ? JSON.stringify([venue("a"), { bad: 1 }]) : null), setItem: () => undefined };
    expect(loadSaved(storage).map((e) => e.id)).toEqual(["a"]);
  });

  it("shares ids only, and parses shared ids safely", () => {
    const list = toggleSaved(setNote(toggleSaved([], venue("osm:node/1"), now), "osm:node/1", "secret"), venue("gers:2"), now);
    const path = sharedListPath(list);
    expect(path).toBe("/saved?list=osm%3Anode%2F1%2Cgers%3A2");
    expect(path).not.toContain("secret");
    expect(parseIdList(new URLSearchParams(path.split("?")[1]).get("list"))).toEqual(["osm:node/1", "gers:2"]);
    expect(parseIdList("a,<script>,a")).toEqual(["a"]);
  });
});

describe("compare list", () => {
  it("adds up to three and refuses a fourth", () => {
    expect(toggleCompare(["a", "b"], "c")).toEqual({ ids: ["a", "b", "c"], refused: false });
    expect(toggleCompare(["a", "b", "c"], "d")).toEqual({ ids: ["a", "b", "c"], refused: true });
    expect(toggleCompare(["a", "b", "c"], "b")).toEqual({ ids: ["a", "c"], refused: false });
  });
});
