import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Venue } from "../data/types";
import { haversineKm } from "./kenya";
import { gymsNear, parseNearQuery, prepareLandmarks, searchLandmarks } from "./landmarks";

const raw = JSON.parse(readFileSync(new URL("../../public/data/landmarks.json", import.meta.url), "utf8")).landmarks;
const landmarks = prepareLandmarks(raw);
const gyms = (JSON.parse(readFileSync(new URL(`../../public${JSON.parse(readFileSync(new URL("../../public/data/manifest.json", import.meta.url), "utf8")).gymsPath}`, import.meta.url), "utf8")).gyms as Venue[])
  .filter((venue) => venue.trust.tier !== "unconfirmed");

describe("landmark search", () => {
  it("finds Sarit Centre from a short, lower-case query", () => {
    expect(searchLandmarks(landmarks, "sarit")[0]?.name).toBe("Sarit Centre");
  });

  it("reads 'near yaya' as a landmark query", () => {
    expect(parseNearQuery("near yaya")).toBe("yaya");
    expect(parseNearQuery("gyms near the Junction")).toBe("Junction");
    expect(parseNearQuery("yaya")).toBeNull();
    expect(searchLandmarks(landmarks, "near yaya")[0]?.name).toBe("Yaya Centre");
  });

  it("tolerates a typo", () => {
    expect(searchLandmarks(landmarks, "westgte")[0]?.name).toMatch(/Westgate/);
  });

  it("drops a shop or office named after the mall it sits in", () => {
    expect(landmarks.some((item) => item.name === "Sarit Centre Administration")).toBe(false);
    expect(landmarks.some((item) => item.name === "Healthy U Yaya Centre")).toBe(false);
  });

  it("gives every landmark a unique, readable slug", () => {
    const slugs = landmarks.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(landmarks.find((item) => item.name === "Sarit Centre")?.slug).toBe("sarit-centre");
  });

  it("lists gyms within 3 km of Sarit Centre, nearest first", () => {
    const sarit = landmarks.find((item) => item.name === "Sarit Centre")!;
    const near = gymsNear(gyms, sarit);
    expect(near.length).toBeGreaterThan(3);
    expect(near.slice(0, 5).map((venue) => venue.name)).toContain("SmashFit Gym Sarit");
    const km = near.map((venue) => haversineKm(sarit, venue));
    expect(Math.max(...km)).toBeLessThanOrEqual(3);
    expect([...km].sort((a, b) => a - b)).toEqual(km);
  });
});
