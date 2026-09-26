/** Refresh the checked-in, keyless Kenya town index from the GeoNames country dump. */
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "data", "kenya-places.json");
const boundary = JSON.parse(readFileSync(path.join(root, "data", "kenya-boundary.json"), "utf8"));
const sourceUrl = "https://download.geonames.org/export/dump/KE.zip";

function zipMember(zip, filename) {
  let end = -1;
  for (let offset = zip.length - 22; offset >= Math.max(0, zip.length - 65557); offset--) {
    if (zip.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw new Error("Invalid GeoNames ZIP (no directory)");
  let offset = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  for (let index = 0; index < count; index++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid GeoNames ZIP entry");
    const method = zip.readUInt16LE(offset + 10);
    const size = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    offset += 46 + nameLength + extraLength + commentLength;
    if (name !== filename) continue;
    if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid GeoNames ZIP local entry");
    const start = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    const data = zip.subarray(start, start + size);
    if (method === 0) return data.toString("utf8");
    if (method === 8) return inflateRawSync(data).toString("utf8");
    throw new Error(`Unsupported GeoNames ZIP compression (${method})`);
  }
  throw new Error(`${filename} not found in GeoNames ZIP`);
}

function insideRing(ring, lat, lng) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inKenya(lat, lng) {
  return boundary.polygons.some((polygon) =>
    insideRing(polygon[0], lat, lng) && !polygon.slice(1).some((ring) => insideRing(ring, lat, lng)));
}

async function main() {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`GeoNames download failed: ${response.status}`);
  const zip = Buffer.from(await response.arrayBuffer());
  const rows = zipMember(zip, "KE.txt").trim().split("\n");
  const places = rows.flatMap((row) => {
    const columns = row.split("\t");
    const [id, name, , , latText, lngText, featureClass, featureCode] = columns;
    const lat = Number(latText);
    const lng = Number(lngText);
    const population = Number(columns[14] || 0);
    if (featureClass !== "P" || !/^PPL(C|A[1-4]?|X)?$/.test(featureCode)) return [];
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !inKenya(lat, lng)) return [];
    if (featureCode === "PPL" && population < 1000) return [];
    return [{
      id: `geonames/${id}`,
      name,
      kind: featureCode === "PPLX" ? "suburb" : "town",
      location: { lat, lng },
      population,
    }];
  }).sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));
  if (places.length < 100) throw new Error(`Suspiciously small GeoNames index (${places.length}); existing file unchanged`);
  await writeFile(output, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "GeoNames KE country dump, CC BY 4.0",
    count: places.length,
    places,
  }, null, 2));
  console.log(`Wrote ${places.length} Kenyan towns and neighbourhoods → ${output}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
