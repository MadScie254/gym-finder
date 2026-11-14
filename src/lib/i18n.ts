import { en, type CopyKey } from "./copy-en";
import { sw } from "./copy-sw";

export type Lang = "en" | "sw";
export type { CopyKey };
export type Vars = Record<string, string | number>;
export type Translate = (key: CopyKey, vars?: Vars) => string;

export const copy: Record<Lang, Record<CopyKey, string>> = { en, sw };

/** Look up a string and fill `{name}` placeholders. A missing value leaves the placeholder visible, so it is caught in review. */
export function t(lang: Lang, key: CopyKey, vars?: Vars): string {
  const text = copy[lang][key] ?? copy.en[key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** Pick the one or many form. Both languages here only need two forms. */
export function plural(tr: Translate, n: number, one: CopyKey, many: CopyKey): string {
  return n === 1 ? tr(one, { n }) : tr(many, { n });
}

/** "11 Nov 2026" in English, "11 Nov 2026" style in Kiswahili, always in Nairobi time. */
export function formatDate(lang: Lang, iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00+03:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "sw" ? "sw-KE" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" }).format(date);
}
