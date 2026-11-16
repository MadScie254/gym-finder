/**
 * Website links a person found dead, parked or belonging to another business:
 * data/overrides/dead-links.json. The build drops the field, but only while the venue still carries
 * exactly this URL. If a later extract brings a different URL, the new one is kept and the old
 * entry is reported as no longer matching.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { z } from "zod";

export const DeadLink = z.object({
  id: z.string().min(1),
  /** Informational only: the name this entry was written for. */
  name: z.string().optional(),
  field: z.literal("website"),
  url: z.string().url(),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  reason: z.enum(["dead", "parked", "different_business"]),
  /** What was seen when the link was opened, in plain words. */
  finding: z.string().min(3).max(300),
}).strict();

export const DeadLinkFile = z.object({
  note: z.string().optional(),
  links: z.array(DeadLink),
}).strict().superRefine((body, ctx) => {
  const seen = new Set();
  body.links.forEach((link, index) => {
    const key = `${link.id}|${link.field}`;
    if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["links", index], message: `duplicate entry for ${key}` });
    seen.add(key);
  });
});

/** Entries from the file, or none when it does not exist. A malformed file fails the build. */
export async function loadDeadLinks(file) {
  if (!existsSync(file)) return [];
  const parsed = DeadLinkFile.safeParse(JSON.parse(await readFile(file, "utf8")));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return parsed.data.links;
}

export const deadLinkKey = (link) => `${link.id}|${link.field}`;

/**
 * The venue without any link this file marks dead. Other fields stay as they are. Pass a Set as
 * `matched` to learn which entries applied; entries left out of it no longer match any venue.
 */
export function dropDeadLinks(venue, links, matched = new Set()) {
  // A merged venue keeps the id of its OpenStreetMap record and lists the other record's id as an alias.
  const ids = new Set([venue.id, ...(venue.aliases ?? [])]);
  const hits = links.filter((link) => ids.has(link.id) && venue[link.field] === link.url);
  if (hits.length === 0) return venue;
  const next = { ...venue, provenance: { ...venue.provenance } };
  for (const link of hits) {
    next[link.field] = null;
    delete next.provenance[link.field];
    matched.add(deadLinkKey(link));
  }
  return next;
}
