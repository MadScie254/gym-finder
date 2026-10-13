import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const shell = await readFile(path.join(DIST, "index.html"), "utf8");
const manifest = JSON.parse(await readFile(path.join(DIST, "data", "manifest.json"), "utf8"));
const gyms = JSON.parse(await readFile(path.join(DIST, manifest.gymsPath.replace(/^\//, "")), "utf8")).gyms ?? [];
const urls = ["/"];

for (const venue of gyms.filter((item) => item.trust?.tier !== "unconfirmed")) {
  const place = [venue.area, venue.county].filter(Boolean).join(", ");
  const title = `${venue.name}${place ? ` · ${place}` : ""} — Find My Gym`;
  const description = `${venue.name} in ${place || "Kenya"}. ${venue.trust?.reasons?.[0] ?? "Listed. Call to confirm."}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    name: venue.name,
    url: `/gym/${venue.slug}/`,
    geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng },
    ...(venue.address ? { address: venue.address } : {}),
    ...(venue.phones?.[0] ? { telephone: venue.phones[0] } : {}),
    ...(venue.osmUrl ? { sameAs: venue.osmUrl } : {}),
  };
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace("</head>", `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head>`);
  const dir = path.join(DIST, "gym", venue.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
  urls.push(`/gym/${venue.slug}/`);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(DIST, "sitemap.xml"), sitemap);
await writeFile(path.join(DIST, "robots.txt"), "User-agent: *\nAllow: /\n");
console.log(`prerendered ${urls.length - 1} gym pages`);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
