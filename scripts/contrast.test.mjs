import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("./contrast.mjs", import.meta.url));

it("checks the glass and texture pairs, and every pair passes", () => {
  const run = spawnSync(process.execPath, [SCRIPT, "--markdown"], { encoding: "utf8" });
  expect(run.status, run.stderr).toBe(0);
  for (const use of [
    "Sidebar and top bar text on glass",
    "Sidebar and top bar muted text on glass",
    "Sidebar and top bar links on glass",
    "Current page in the sidebar",
    "Muted text in the top bar widget",
    "Text on the selected palette row",
    "Text on glass over content",
    "Muted text on glass over content",
    "Links on glass over content",
    "Focus ring on glass over content",
    "Text on the textured page",
    "Muted text on the textured page",
    "Links on the textured page",
  ]) {
    expect(run.stdout, use).toContain(use);
  }
});
