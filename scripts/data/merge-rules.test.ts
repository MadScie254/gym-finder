import { describe, expect, it } from "vitest";
import {
  clusterRecords,
  displayName,
  isProximityOnlyCandidate,
  nameTokens,
  reviewReason,
  shouldMerge,
  slugify,
  tokenJaccard,
} from "./merge-rules.mjs";

// ~1 m of latitude is 9e-6 degrees; offsets below are metres expressed that way.
const north = (metres: number) => metres * 9e-6;
const rec = (id: string, name: string, metres = 0, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  lat: -1.3 + north(metres),
  lng: 36.8,
  phones: [] as string[],
  website: null as string | null,
  sources: [id.split(":")[0] === "osm" ? "osm" : "overture"],
  ...extra,
});

describe("name matching (rule c)", () => {
  it("merges AICAD gym / AICAD Gymnasium: within 150 m and Jaccard 0.5", () => {
    expect(tokenJaccard("AICAD gym", "AICAD Gymnasium")).toBeGreaterThanOrEqual(0.5);
    expect(shouldMerge(rec("osm:node/1", "AICAD gym"), rec("gers:a", "AICAD Gymnasium", 30)).merge).toBe(true);
  });

  it("strips stop-words: Level 24 == Level 24 Gym and Fitness Centre", () => {
    expect([...nameTokens("Level 24 Gym and Fitness Centre")]).toEqual(["level", "24"]);
    expect(shouldMerge(rec("osm:node/1", "Level 24"), rec("gers:a", "Level 24 Gym and Fitness Centre", 10)).merge).toBe(true);
  });

  it("is strict about distance: identical names 164 m apart are NOT merged, only flagged", () => {
    const a = rec("osm:node/1", "Racing Sport Gym");
    const b = rec("gers:a", "Racing Sport Gym", 164);
    expect(shouldMerge(a, b).merge).toBe(false);
    expect(reviewReason(a, b)).toBe("name-near");
  });

  it("is strict about the name: 100 m apart with different names is not a merge", () => {
    expect(shouldMerge(rec("osm:node/1", "Alpha Fit"), rec("gers:a", "Zeal Studio", 100)).merge).toBe(false);
  });

  it("a name made only of stop-words matches an equal one, nothing else", () => {
    expect(tokenJaccard("Fitness Centre", "The Fitness Center")).toBe(1);
    expect(tokenJaccard("Gym", "Fitness")).toBe(0);
  });
});

describe("never auto-merge on proximity alone", () => {
  const cases: [string, string, number][] = [
    ["Fahari Gym and Sports", "Samnick Enterprises", 21],
    ["Racing Sport Gym", "Ultra Smart Controls", 51],
    ["Veteran Fitness Center", "Cool Gym Equipment", 39],
  ];
  for (const [osmName, overtureName, metres] of cases) {
    it(`${osmName} vs ${overtureName} (${metres} m) is a review candidate, not a merge`, () => {
      const a = rec("osm:node/1", osmName);
      const b = rec("gers:x", overtureName, metres);
      expect(shouldMerge(a, b).merge).toBe(false);
      expect(isProximityOnlyCandidate(a, b)).toBe(true);
      const { clusters, review } = clusterRecords([a, b]);
      expect(clusters).toHaveLength(2);
      expect(review).toHaveLength(1);
      expect(review[0]).toMatchObject({ reason: "proximity-only", a: "osm:node/1", b: "gers:x", metres });
    });
  }

  it("a deny-listed ghost record still shows up in the review list, flagged", () => {
    const veteran = rec("osm:node/1", "Veteran Fitness Center");
    const ghost = { ...rec("gers:cool", "Cool Gym Equipment", 39), removedBy: "denylist" };
    const { review } = clusterRecords([veteran], { ghosts: [ghost] });
    expect(review).toHaveLength(1);
    expect(review[0]).toMatchObject({ b: "gers:cool", removedBy: "denylist" });
  });

  it("proximity-only means no phone, website or name agreement", () => {
    const phone = ["+254700000001"];
    expect(isProximityOnlyCandidate(rec("a:1", "One", 0, { phones: phone }), rec("b:2", "Two", 10, { phones: phone }))).toBe(false);
    expect(isProximityOnlyCandidate(rec("a:1", "One"), rec("b:2", "Two", 70))).toBe(false); // beyond 60 m
  });
});

describe("shared phone or website (rules a and b)", () => {
  const phone = ["+254722784664"];
  it("same phone within 150 m merges on its own", () => {
    expect(shouldMerge(rec("a:1", "Alpha", 0, { phones: phone }), rec("b:2", "Beta", 40, { phones: phone }))).toMatchObject({ merge: true, reason: "phone" });
  });

  it("same phone 600 m apart needs agreeing names", () => {
    const near = shouldMerge(rec("a:1", "Olympia Gym", 0, { phones: phone }), rec("b:2", "Olympia Fitness Center", 600, { phones: phone }));
    expect(near).toMatchObject({ merge: true, reason: "phone+name" });
    expect(shouldMerge(rec("a:1", "Pent Hse Gymnasium", 0, { phones: phone }), rec("b:2", "Figure 8 and six pack", 230, { phones: phone })).merge).toBe(false);
  });

  it("the same phone 21 km apart is two branches of a chain, never one venue", () => {
    expect(shouldMerge(rec("a:1", "Smart Gyms", 0, { phones: phone }), rec("b:2", "Smart Gyms", 21000, { phones: phone })).merge).toBe(false);
  });

  it("same own-domain website merges; a shared social host does not", () => {
    const own = (url: string) => ({ website: url });
    expect(shouldMerge(rec("a:1", "A", 0, own("https://www.powerzone.co.ke/")), rec("b:2", "B", 5, own("http://powerzone.co.ke/x")))).toMatchObject({ merge: true, reason: "website" });
    expect(shouldMerge(rec("a:1", "A", 0, own("https://www.instagram.com/a")), rec("b:2", "B", 5, own("https://instagram.com/b"))).merge).toBe(false);
    expect(shouldMerge(rec("a:1", "A", 0, own("https://linktr.ee/a")), rec("b:2", "B", 5, own("https://linktr.ee/b"))).merge).toBe(false);
  });

  it("reports a distant shared contact for a human instead of merging", () => {
    const a = rec("a:1", "Zoezi Club", 0, { phones: phone });
    const b = rec("b:2", "Zoezi Gym", 266000, { phones: phone });
    expect(reviewReason(a, b)).toBe("shared-contact-distant");
  });
});

describe("forced pairs and clustering", () => {
  it("a forced pair in merge.json merges unrelated records", () => {
    const a = rec("osm:node/1", "Alpha");
    const b = rec("gers:x", "Totally Different", 5000);
    expect(shouldMerge(a, b).merge).toBe(false);
    expect(shouldMerge(a, b, new Set(["gers:x|osm:node/1"]))).toMatchObject({ merge: true, reason: "override" });
    expect(clusterRecords([a, b], { forcedPairs: ["gers:x|osm:node/1"] }).clusters).toHaveLength(1);
  });

  it("merges transitively and keeps unrelated records apart", () => {
    const a = rec("a:1", "Level 24", 0);
    const b = rec("b:2", "Level 24 Gym", 40);
    const c = rec("c:3", "Level 24 Fitness Centre", 80);
    const other = rec("d:4", "Elsewhere", 9000);
    const { clusters, merges } = clusterRecords([a, b, c, other]);
    expect(clusters.map((cluster) => cluster.length).sort()).toEqual([1, 3]);
    expect(merges.length).toBeGreaterThanOrEqual(2);
  });

  it("a forced pair is not reported as a review candidate", () => {
    const a = rec("osm:node/1", "Fahari Gym and Sports");
    const b = rec("gers:x", "Samnick Enterprises", 21);
    expect(clusterRecords([a, b], { forcedPairs: ["gers:x|osm:node/1"] }).review).toEqual([]);
  });
});

describe("names and slugs", () => {
  it("fixes ALL-CAPS and underscores, keeps acronyms and mixed case", () => {
    expect(displayName("ROYS GYM")).toBe("Roys Gym");
    expect(displayName("Home_gym  Equipments")).toBe("Home gym Equipments");
    expect(displayName("Stardom_Gym")).toBe("Stardom Gym");
    expect(displayName("CNC GYM KE")).toBe("CNC Gym Ke");
    expect(displayName("FIT FOR LIFE")).toBe("Fit for Life");
    expect(displayName("MAMA'S GYM")).toBe("Mama's Gym");
    expect(displayName("DOJO")).toBe("DOJO");
    expect(displayName("AICAD gym")).toBe("AICAD gym");
    expect(displayName("  ")).toBe("");
  });

  it("folds mathematical-alphabet names to plain letters", () => {
    expect(displayName("𝑫𝒓𝒂𝒈𝒐𝒏 𝑻𝒂𝒆𝒌𝒘𝒐𝒏𝒅𝒐")).toBe("Dragon Taekwondo");
  });

  it("slug = slugify(name) + 4 hex chars, stable per id, longer on collision", () => {
    const slug = slugify("Level 24 Gym and Fitness Centre", "osm:node/14148174874");
    expect(slug).toMatch(/^level-24-gym-and-fitness-centre-[0-9a-f]{4}$/);
    expect(slugify("Level 24 Gym and Fitness Centre", "osm:node/14148174874")).toBe(slug);
    expect(slugify("Level 24 Gym and Fitness Centre", "osm:node/1")).not.toBe(slug);
    expect(slugify("Level 24 Gym and Fitness Centre", "osm:node/14148174874", 2)).toMatch(/-[0-9a-f]{6}$/);
    expect(slugify("Café Müller", "x")).toMatch(/^cafe-muller-/);
    expect(slugify("", "x")).toMatch(/^gym-[0-9a-f]{4}$/);
  });
});
