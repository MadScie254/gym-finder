import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlacePages } from "./prerender-places.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.PRERENDER_DIST ? path.resolve(process.env.PRERENDER_DIST) : path.join(ROOT, "dist");
// Absolute URLs for canonical links, JSON-LD, the sitemap and robots.txt. Set SITE_URL when a custom
// domain exists. On Vercel the production domain is provided. A local build gets localhost, never a
// domain this project does not own.
const configuredSite = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
const site = new URL(configuredSite || "http://localhost:4173");
if (!["https:", "http:"].includes(site.protocol)) throw new Error("SITE_URL must be an HTTP(S) URL");
const SITE_ORIGIN = site.origin;
const MAX_LISTED = 200;
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
  const html = renderPage({ title, description, url, jsonLd, body: staticDetail });
  const dir = path.join(DIST, "gym", venue.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
  urls.push(url);
}

const gymCount = urls.length - 1;
for (const page of buildPlacePages(gyms)) {
  const url = `${SITE_ORIGIN}${page.path}`;
  const label = page.kind === "county" ? `${page.name} County` : page.name;
  const count = page.gyms.length;
  const withPhone = page.gyms.filter((gym) => gym.phones?.length || gym.whatsapp).length;
  const title = `Gyms in ${label}, Kenya — Find My Gym`;
  const description = `${count} ${count === 1 ? "gym" : "gyms"} listed in ${label}${withPhone ? `, ${withPhone} with a phone number` : ""}. Sources: OpenStreetMap and Overture Maps. Confirm details with the gym before you go.`;
  const listed = page.gyms.slice(0, MAX_LISTED);
  const gymUrl = (gym) => `/gym/${encodeURIComponent(gym.slug)}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Gyms in ${label}`,
    url,
    numberOfItems: count,
    itemListElement: listed.slice(0, 50).map((gym, index) => ({ "@type": "ListItem", position: index + 1, name: gym.name, url: `${SITE_ORIGIN}${gymUrl(gym)}` })),
  };
  const items = listed.map((gym) => {
    const where = gym.area || gym.town;
    return `<li><a href="${gymUrl(gym)}">${escapeHtml(gym.name)}</a>${where ? `, ${escapeHtml(where)}` : ""}</li>`;
  }).join("");
  const more = count > listed.length ? `<p>Showing ${listed.length} of ${count}. Open the page for the full list and map.</p>` : "";
  const body = `<main class="prerender-detail"><a href="/">Find My Gym</a><h1>Gyms in ${escapeHtml(label)}</h1><p>${escapeHtml(description)}</p><ul>${items}</ul>${more}</main>`;
  const dir = path.join(DIST, ...page.path.split("/").filter(Boolean));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), renderPage({ title, description, url, jsonLd, body }));
  urls.push(url);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(DIST, "sitemap.xml"), sitemap);
await writeFile(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);
console.log(`prerendered ${gymCount} gym pages and ${urls.length - 1 - gymCount} county and place pages`);

function renderPage({ title, description, url, jsonLd, body }) {
  // Function replacers: a gym name containing "$&" must not be read as a replacement pattern.
  return shell
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace("</head>", () => `<link rel="canonical" href="${escapeHtml(url)}" /><script type="application/ld+json">${safeJson(jsonLd)}</script></head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
}
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
