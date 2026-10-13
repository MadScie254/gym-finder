/**
 * public/data/landmarks.json: malls, universities, stadiums and bus stations for
 * "near Yaya Centre" style search. Overture rows only, country KE and inside the
 * Kenya polygon, confidence >= 0.6 (brief 5.7), de-duplicated, with short ids and
 * 5-decimal coordinates so the file stays well under its 60 KB gzip budget.
 */
import { gzipSync } from "node:zlib";
import { isInKenya } from "./geo.mjs";
import { displayName, haversineM } from "./merge-rules.mjs";

export const LANDMARK_GZIP_BUDGET = 60 * 1024;
const KIND = {
  shopping_mall: "shopping_mall",
  college_university: "college_university",
  bus_station: "bus_station",
  stadium_arena: "stadium_arena",
  soccer_stadium: "stadium_arena",
  football_stadium: "stadium_arena",
};
const round5 = (value) => Math.round(Number(value) * 1e5) / 1e5;
const key = (name) => name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** @returns {{ landmarks: object[], counts: Record<string, number>, gzipBytes: number, minConfidence: Record<string, number> }} */
export function buildLandmarks(rows, { minConfidence = 0.6, budget = LANDMARK_GZIP_BUDGET } = {}) {
  const thresholds = Object.fromEntries(Object.values(KIND).map((kind) => [kind, minConfidence]));
  for (;;) {
    const kept = [];
    for (const row of rows) {
      const kind = KIND[row.tax];
      const name = displayName(row.name);
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!kind || row.country !== "KE" || name.length < 3 || Number(row.confidence ?? 0) < thresholds[kind] || !isInKenya({ lat, lng })) continue;
      kept.push({ gid: `${row.id}`, name, kind, lat, lng, confidence: Number(row.confidence ?? 0) });
    }
    // Same name within 300 m is one place (campuses and malls appear several times): keep the most confident.
    kept.sort((a, b) => b.confidence - a.confidence || (a.gid < b.gid ? -1 : 1));
    const unique = [];
    for (const item of kept) {
      const twin = unique.find((other) => other.kind === item.kind && key(other.name) === key(item.name) && haversineM(other, item) <= 300);
      if (!twin) unique.push(item);
    }
    const used = new Set();
    const landmarks = unique
      .sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : a.gid < b.gid ? -1 : 1))
      .map((item) => {
        let length = 8;
        while (used.has(item.gid.replaceAll("-", "").slice(0, length))) length += 2;
        const short = item.gid.replaceAll("-", "").slice(0, length);
        used.add(short);
        return { id: `l:${short}`, name: item.name, kind: item.kind, lat: round5(item.lat), lng: round5(item.lng) };
      });
    const gzipBytes = gzipSync(JSON.stringify({ landmarks })).length;
    // Over budget: raise the university threshold first (1,281 records, the long tail), then everything.
    if (gzipBytes <= budget || thresholds.college_university >= 0.95) {
      const counts = {};
      for (const item of landmarks) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
      return { landmarks, counts, gzipBytes, minConfidence: thresholds };
    }
    thresholds.college_university = Math.round((thresholds.college_university + 0.05) * 100) / 100;
  }
}
