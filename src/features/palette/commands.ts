import { Bookmark, CalendarDays, Download, FilePlus, Flag, Languages, LocateFixed, Moon, type LucideIcon } from "lucide-react";
import { NAV_GROUPS, type NavId } from "../../app/nav";
import type { Venue } from "../../data/types";
import type { IssueKind } from "../../lib/backend";
import { foldPlace } from "../../lib/filterVenues";
import type { CopyKey, Lang, Translate } from "../../lib/i18n";
import type { ThemeChoice } from "../../lib/storage";

export type CommandGroup = "actions" | "go" | "settings";

export type Command = {
  id: string;
  group: CommandGroup;
  label: string;
  hint?: string;
  /** Mirrors `NavEntry.tag`: the palette shows the Demo tag beside a command that opens a simulated service. */
  tag?: "demo";
  icon: LucideIcon;
  /** Extra words that find the command. Matched after folding case and accents. */
  keywords: readonly string[];
  run: () => void;
};

export type CommandContext = {
  tr: Translate;
  lang: Lang;
  theme: ThemeChoice;
  /** The gym on screen, or null away from a gym page. */
  venue: Venue | null;
  /** Whether `venue` is saved. */
  saved: boolean;
  savedCount: number;
  canInstall: boolean;
  go: (to: string) => void;
  locate: () => void;
  setLang: (lang: Lang) => void;
  cycleTheme: () => void;
  install: () => void;
  openReport: (kind: IssueKind, venue: Venue | null) => void;
  toggleSaved: (venue: Venue) => void;
};

const GROUP_ORDER: readonly CommandGroup[] = ["actions", "go", "settings"];

const THEME_KEY: Record<ThemeChoice, CopyKey> = { system: "theme_system", light: "theme_light", dark: "theme_dark" };

/** Synonyms for the Go to commands. Typed on NavId, so a new page cannot be added without them. */
const GO_KEYWORDS: Record<NavId, readonly string[]> = {
  home: ["start", "front page"],
  find: ["search", "gyms", "map", "list", "tafuta"],
  saved: ["favourites", "bookmarks", "shortlist", "hifadhi"],
  week: ["plan", "routine", "schedule", "workout", "sessions", "wiki"],
  meals: ["food", "eat", "diet", "chakula"],
  shopping: ["groceries", "buy"],
  order: ["food", "delivery", "fuel", "chakula"],
  reports: ["problems", "issues", "submitted", "feedback", "ripoti"],
  about: ["data", "sources", "openstreetmap", "overture", "trust", "how it works"],
  legal: ["privacy", "terms", "cookies", "disclaimer", "policy", "faragha"],
};

/**
 * Everything the palette can do besides finding a gym or place, in display order: actions, then pages,
 * then settings. Commands that need a gym on screen, or a browser that can install the app, are left out
 * when they cannot run.
 */
export function buildCommands(ctx: CommandContext): Command[] {
  const { tr, venue } = ctx;

  const actions: Command[] = [
    {
      id: "locate",
      group: "actions",
      label: tr("paletteLocate"),
      hint: tr("paletteLocateHint"),
      icon: LocateFixed,
      keywords: ["near me", "nearby", "closest", "distance", "gps", "mahali", "karibu"],
      run: ctx.locate,
    },
    {
      id: "add-gym",
      group: "actions",
      label: tr("menuAddGym"),
      icon: FilePlus,
      keywords: ["new", "missing", "submit", "list", "ongeza"],
      run: () => ctx.openReport("add_gym", null),
    },
    {
      id: "setup-week",
      group: "actions",
      label: tr("paletteSetupWeek"),
      icon: CalendarDays,
      keywords: ["plan", "routine", "schedule", "workout", "wiki", "panga"],
      run: () => ctx.go("/plan/setup"),
    },
  ];

  if (venue) {
    actions.push(
      {
        id: "report-gym",
        group: "actions",
        label: tr("paletteReportGym"),
        icon: Flag,
        keywords: ["wrong", "incorrect", "closed", "duplicate", "problem", "error", "ripoti", "tatizo"],
        run: () => ctx.openReport("wrong_details", venue),
      },
      {
        id: "save-gym",
        group: "actions",
        label: tr(ctx.saved ? "paletteUnsave" : "paletteSave"),
        icon: Bookmark,
        keywords: ctx.saved
          ? ["unsave", "bookmark", "favourite", "delete", "ondoa"]
          : ["bookmark", "favourite", "keep", "shortlist", "hifadhi"],
        run: () => ctx.toggleSaved(venue),
      },
    );
  }

  const go: Command[] = NAV_GROUPS.flatMap((group) => group.items).map((entry) => ({
    id: `go-${entry.id}`,
    group: "go" as const,
    label: tr(entry.labelKey),
    hint: entry.count === "saved" && ctx.savedCount > 0 ? tr("paletteSavedHint", { n: ctx.savedCount }) : undefined,
    tag: entry.tag,
    icon: entry.icon,
    keywords: GO_KEYWORDS[entry.id],
    run: () => ctx.go(entry.to),
  }));

  const settings: Command[] = [
    {
      id: "language",
      group: "settings",
      label: tr("paletteSwitchLang", { language: tr(ctx.lang === "en" ? "langSwahili" : "langEnglish") }),
      icon: Languages,
      keywords: ["language", "lugha", "translate"],
      run: () => ctx.setLang(ctx.lang === "en" ? "sw" : "en"),
    },
    {
      id: "appearance",
      group: "settings",
      label: tr("paletteTheme", { theme: tr(THEME_KEY[ctx.theme]) }),
      icon: Moon,
      keywords: ["dark", "light", "mode", "theme", "night", "appearance", "giza", "mwanga", "mwonekano"],
      run: ctx.cycleTheme,
    },
  ];

  if (ctx.canInstall) {
    settings.push({
      id: "install",
      group: "settings",
      label: tr("menuInstall"),
      icon: Download,
      keywords: ["app", "pwa", "home screen", "desktop", "phone", "download", "sakinisha"],
      run: ctx.install,
    });
  }

  return [...actions, ...go, ...settings];
}

/** 3: the label starts with the query. 2: a word in the label does. 1: the label contains it, or a keyword does. 0: no match. */
function score(command: Command, query: string): number {
  const label = foldPlace(command.label);
  if (label.startsWith(query)) return 3;
  if (label.includes(` ${query}`)) return 2;
  if (label.includes(query) || command.keywords.some((word) => foldPlace(word).includes(query))) return 1;
  return 0;
}

/**
 * The commands to show for what was typed. Groups keep their fixed order; inside a group the better matches
 * come first and ties keep their registry order. Case, accents and extra spaces do not matter. A blank query
 * keeps everything. At most `perGroup` commands are kept for each group.
 */
export function rankCommands(commands: readonly Command[], query: string, perGroup = 8): Command[] {
  const q = foldPlace(query);
  const ranked = commands
    .map((command, index) => ({ command, index, score: q ? score(command, q) : 1 }))
    .filter((item) => item.score > 0)
    .sort((a, b) => GROUP_ORDER.indexOf(a.command.group) - GROUP_ORDER.indexOf(b.command.group) || b.score - a.score || a.index - b.index);

  const taken = new Map<CommandGroup, number>();
  const result: Command[] = [];
  for (const { command } of ranked) {
    const count = taken.get(command.group) ?? 0;
    if (count >= perGroup) continue;
    taken.set(command.group, count + 1);
    result.push(command);
  }
  return result;
}
