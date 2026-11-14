/**
 * URL slug for place, county and landmark pages. `scripts/prerender.mjs` has a copy of this
 * function (it runs in plain Node); `slug.test.ts` keeps the two in step.
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
