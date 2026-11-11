import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DuckDBConnection } from "@duckdb/node-api";
import { expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("./extract-overture.mjs", import.meta.url));

it("extracts a local parquet fixture through the Node API when no DuckDB CLI exists", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fmg-overture-"));
  try {
    const parquet = path.join(dir, "places.parquet").replaceAll("\\", "/");
    const output = path.join(dir, "output");
    const db = await DuckDBConnection.create();
    await db.run(`COPY (
      SELECT 'fixture-1' AS id,
        {'primary': 'Test Gym'} AS names,
        {'primary': 'gym', 'hierarchy': ['gym']} AS taxonomy,
        'gym' AS basic_category, 0.95 AS confidence,
        [{'freeform': 'Test Street', 'locality': 'Nairobi', 'region': 'Nairobi', 'country': 'KE'}] AS addresses,
        ['+254700123456'] AS phones, ['https://example.test'] AS websites,
        []::VARCHAR[] AS socials, []::VARCHAR[] AS emails,
        [{'dataset': 'fixture', 'license': 'test', 'update_time': '2026-10-30'}] AS sources,
        'open' AS operating_status,
        {'xmin': 36.82, 'ymin': -1.28} AS bbox
    ) TO '${parquet}' (FORMAT parquet)`);
    const run = spawnSync(process.execPath, [SCRIPT], {
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...process.env,
        OVERTURE_RELEASE: "fixture",
        OVERTURE_PARQUET_SOURCE: parquet,
        OVERTURE_OUTPUT_DIR: output,
      },
    });
    expect(run.status, run.stderr || run.error?.message).toBe(0);
    expect(readFileSync(path.join(output, "overture-venues.json"), "utf8")).toContain("Test Gym");
    expect(readFileSync(path.join(output, "overture-meta.json"), "utf8")).toContain('"release": "fixture"');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
