import { describe, expect, it } from "vitest";
import { diffReport } from "./diff-report.mjs";

const v = (id: string, name: string, tier = "listed", sources = ["overture"], aliases: string[] = []) =>
  ({ id, name, county: "Nairobi", aliases, trust: { tier, sources } });

describe("diff report", () => {
  const previous = [
    v("gers:a", "Alpha Fit", "corroborated", ["osm", "overture"]),
    v("gers:b", "Beta Gym"),
    v("gers:c", "Gone Gym"),
    v("gers:d", "Delta"),
  ];
  const current = [
    v("gers:a", "Alpha Fit", "listed", ["overture"]),
    v("gers:b", "Beta Gym and Spa"),
    v("osm:node/9", "Delta", "corroborated", ["osm", "overture"], ["gers:d"]),
    v("gers:e", "New Gym"),
  ];
  const report = diffReport(current, previous, {
    review: [{ reason: "proximity-only" }, { reason: "name-near" }],
    hits: [{ rule: "denylist:salon", action: "removed" }, { rule: "category:spa", action: "removed" }],
  });

  it("counts by tier against the previous build", () => {
    expect(report).toContain("- Total: 4 (was 4)");
    expect(report).toContain("corroborated 1 (was 1), listed 3 (was 3)");
  });

  it("lists added, removed, renamed, lost-a-source and tier changes; an id absorbed as an alias is not removed", () => {
    expect(report).toContain("## Added (1)\n- New Gym (Nairobi, listed)\n\n## Removed");
    expect(report).toContain("## Removed (1)\n- Gone Gym (Nairobi)");
    expect(report).toContain("- Beta Gym -> Beta Gym and Spa");
    expect(report).toContain("- Alpha Fit: no longer in osm");
    expect(report).toContain("- Alpha Fit: corroborated -> listed");
    expect(report).toContain("- Delta: listed -> corroborated");
    expect(report).not.toMatch(/Removed[^#]*Delta/);
  });

  it("says what waits for a human", () => {
    expect(report).toContain("2 review pairs (proximity-only 1, name-near 1), 1 deny-list/exclude removals");
  });

  it("works with no previous build", () => {
    const first = diffReport(current, []);
    expect(first).toContain("- Total: 4\n");
    expect(first).toContain("## Added (4)");
  });
});
