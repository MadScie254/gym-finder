import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.PRERENDER_DIST ? path.resolve(process.env.PRERENDER_DIST) : path.join(ROOT, "dist");
const site = new URL(process.env.SITE_URL || "https://findmygym.ke");
if (!["https:", "http:"].includes(site.protocol)) throw new Error("SITE_URL must be an HTTP(S) URL");
const SITE_ORIGIN = site.origin;
const shell = await readFile(path.join(DIST, "index.html"), "utf8");
const manifest = JSON.parse(await readFile(path.join(DIST, "data", "manifest.json"), "utf8"));
const gyms = JSON.parse(await readFile(path.join(DIST, manifest.gymsPath.replace(/^\//, "")), "utf8")).gyms ?? [];
const urls = [`${SITE_ORIGIN}/`];

for (const venue of gyms.filter((item) => item.trust?.tier !== "unconfirmed")) {
  const place = [...new Set([venue.area, venue.town, venue.county].filter(Boolean))].join(", ");
  const url = `${SITE_ORIGIN}/gym/${encodeURIComponent(venue.slug)}/`;
  const title = `${venue.name}${place ? ` · ${place}` : ""} — Find My Gym`;
  const description = `${venue.name} in ${place || "Kenya"}. ${venue.trust?.reasons?.[0] ?? "Listed. Call to confirm."}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    name: venue.name,
    url,
    geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng },
    ...(venue.address ? { address: venue.address } : {}),
    ...(venue.phones?.[0] ? { telephone: venue.phones[0] } : {}),
    ...(safeHttpUrl(venue.osmUrl) ? { sameAs: venue.osmUrl } : {}),
  };
  const contact = venue.phones?.[0] && /^\+?\d{6,20}$/.test(venue.phones[0])
    ? `<a href="tel:${escapeHtml(venue.phones[0])}">Call ${escapeHtml(venue.phones[0])}</a>`
    : "Contact not listed; confirm details before travelling.";
  const staticDetail = `<main class="prerender-detail">
    <a href="/">Find My Gym</a>
    <article><h1>${escapeHtml(venue.name)}</h1>
    <p>${escapeHtml(place || "Location in Kenya")}</p>
    <p>${escapeHtml(venue.trust?.reasons?.[0] ?? "Listed; call to confirm details.")}</p>
    ${venue.address ? `<p>Address: ${escapeHtml(venue.address)}</p>` : "<p>Address not listed.</p>"}
    ${venue.hours?.raw ? `<p>Hours from source: ${escapeHtml(venue.hours.raw)}. Confirm before visiting.</p>` : "<p>Hours not listed.</p>"}
    <p>${contact}</p>
    <p><a href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent(`${venue.lat},${venue.lng}`)}">Directions</a></p>
    <p>Sources: ${escapeHtml((venue.trust?.sources ?? []).join(", "))}</p>
    </article></main>`;
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace("</head>", `<link rel="canonical" href="${escapeHtml(url)}" /><script type="application/ld+json">${safeJson(jsonLd)}</script></head>`)
    .replace('<div id="root"></div>', `<div id="root">${staticDetail}</div>`);
  const dir = path.join(DIST, "gym", venue.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
  urls.push(url);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(DIST, "sitemap.xml"), sitemap);
await writeFile(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);
console.log(`prerendered ${urls.length - 1} gym pages`);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function safeHttpUrl(value) {
  if (!value) return false;
  try { return ["https:", "http:"].includes(new URL(value).protocol); }
  catch { return false; }
}
