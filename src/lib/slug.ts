/**
 * URL slug for place, county and landmark pages. `scripts/prerender-places.mjs` has a copy of this
 * function (it runs in plain Node); `scripts/prerender.test.mjs` keeps the two in step.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
