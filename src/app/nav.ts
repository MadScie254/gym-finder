import { Bookmark, CalendarDays, Flag, House, Info, ListChecks, Search, ShieldCheck, ShoppingBasket, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CopyKey } from "../lib/i18n";

export type NavId = "home" | "find" | "saved" | "week" | "meals" | "shopping" | "order" | "reports" | "about" | "legal";

export type NavEntry = {
  id: NavId;
  to: string;
  labelKey: CopyKey;
  icon: LucideIcon;
  /** Other path prefixes that count as this entry, for example "/gym/" for Find gyms. */
  also?: readonly string[];
  tag?: "demo";
  count?: "saved";
};

export type NavGroup = { id: "explore" | "plan" | "help"; labelKey: CopyKey; items: readonly NavEntry[] };

/** The desktop sidebar and the palette's "Go to" group both read this list. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "explore",
    labelKey: "navGroupExplore",
    items: [
      { id: "home", to: "/", labelKey: "navHome", icon: House },
      { id: "find", to: "/search", labelKey: "navFind", icon: Search, also: ["/in/", "/county/", "/near/", "/gym/", "/compare"] },
      { id: "saved", to: "/saved", labelKey: "navSaved", icon: Bookmark, count: "saved" },
    ],
  },
  {
    id: "plan",
    labelKey: "navGroupPlan",
    items: [
      { id: "week", to: "/plan", labelKey: "navWeek", icon: CalendarDays },
      { id: "meals", to: "/plan/meals", labelKey: "navMeals", icon: Utensils },
      { id: "shopping", to: "/plan/shopping", labelKey: "navShopping", icon: ListChecks },
      { id: "order", to: "/fuel", labelKey: "navOrder", icon: ShoppingBasket, tag: "demo" },
    ],
  },
  {
    id: "help",
    labelKey: "navGroupHelp",
    items: [
      { id: "reports", to: "/reports", labelKey: "menuReports", icon: Flag },
      { id: "about", to: "/about/data", labelKey: "menuAbout", icon: Info },
      { id: "legal", to: "/legal", labelKey: "menuLegal", icon: ShieldCheck },
    ],
  },
];

const ENTRIES: readonly NavEntry[] = NAV_GROUPS.flatMap((group) => group.items);

/** Length of the prefix of `entry` that matches `pathname`, or 0 when none does. */
function matchLength(entry: NavEntry, pathname: string): number {
  if (entry.to === "/") return pathname === "/" ? 1 : 0;
  let best = 0;
  for (const prefix of [entry.to, ...(entry.also ?? [])]) {
    const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
    if (pathname === prefix || pathname.startsWith(base)) best = Math.max(best, prefix.length);
  }
  return best;
}

/** The entry a path belongs to. The longest matching prefix wins, so /plan/meals is Meals, not My week. */
export function currentEntry(pathname: string): NavEntry | null {
  let found: NavEntry | null = null;
  let length = 0;
  for (const entry of ENTRIES) {
    const n = matchLength(entry, pathname);
    if (n > length) { found = entry; length = n; }
  }
  return found;
}

/** Copy key for the page title in the top bar. */
export function pageTitleKey(pathname: string): CopyKey {
  return currentEntry(pathname)?.labelKey ?? "brand";
}
