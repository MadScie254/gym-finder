import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";

const run = promisify(execFile);
const script = fileURLToPath(new URL("./extract-osm.mjs", import.meta.url));
const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

it("keeps the previous OSM snapshot when Overpass returns an empty success", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ elements: [] }));
  });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const dir = await mkdtemp(path.join(tmpdir(), "gym-osm-"));
  const output = path.join(dir, "osm.json");
  try {
    await run(process.execPath, [script], {
      env: {
        ...process.env,
        OVERPASS_ENDPOINTS: `http://127.0.0.1:${server.address().port}/api/interpreter`,
        OSM_OUTPUT_PATH: output,
      },
    });
    const snapshot = JSON.parse(await readFile(output, "utf8"));
    expect(snapshot.osmStale).toBe(true);
    expect(snapshot.venues.length).toBeGreaterThan(0);
    expect(snapshot.count).toBe(snapshot.venues.length);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
