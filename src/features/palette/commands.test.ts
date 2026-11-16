import { Search } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { NAV_GROUPS } from "../../app/nav";
import type { Venue } from "../../data/types";
import { t } from "../../lib/i18n";
import { buildCommands, rankCommands, type Command, type CommandContext } from "./commands";

const venue = { id: "salute", slug: "salute-gym-1", name: "Salute Gym" } as unknown as Venue;

function context(over: Partial<CommandContext> = {}): CommandContext {
  return {
    tr: (key, vars) => t("en", key, vars),
    lang: "en",
    theme: "system",
    venue: null,
    saved: false,
    savedCount: 0,
    canInstall: false,
    go: vi.fn(),
    locate: vi.fn(),
    setLang: vi.fn(),
    cycleTheme: vi.fn(),
    install: vi.fn(),
    openReport: vi.fn(),
    toggleSaved: vi.fn(),
    ...over,
  };
}

const find = (commands: Command[], label: string) => commands.find((command) => command.label === label);
const labels = (commands: Command[]) => commands.map((command) => command.label);

describe("buildCommands", () => {
  it("lists actions, then go to, then settings", () => {
    const groups = buildCommands(context()).map((command) => command.group);
    expect([...new Set(groups)]).toEqual(["actions", "go", "settings"]);
    expect(groups).toEqual([...groups].sort((a, b) => ["actions", "go", "settings"].indexOf(a) - ["actions", "go", "settings"].indexOf(b)));
  });

  it("has one go-to command per nav entry, in sidebar order, each going to its page", () => {
    const ctx = context();
    const go = buildCommands(ctx).filter((command) => command.group === "go");
    const entries = NAV_GROUPS.flatMap((group) => group.items);
    expect(labels(go)).toEqual(entries.map((entry) => t("en", entry.labelKey)));
    go.forEach((command, i) => {
      command.run();
      expect(ctx.go).toHaveBeenLastCalledWith(entries[i].to);
    });
  });

  it("marks Order food as a demo and shows how many gyms are saved", () => {
    const withSaved = buildCommands(context({ savedCount: 3 }));
    expect(find(withSaved, "Order food")?.tag).toBe("demo");
    expect(find(withSaved, "Saved")?.hint).toBe("3 saved");
    expect(find(buildCommands(context()), "Saved")?.hint).toBeUndefined();
  });

  it("offers the gym commands only on a gym page, and the save label follows the saved state", () => {
    const none = buildCommands(context());
    expect(find(none, "Report a problem with this gym")).toBeUndefined();
    expect(find(none, "Save this gym")).toBeUndefined();
    expect(find(none, "Remove from saved")).toBeUndefined();

    const unsaved = buildCommands(context({ venue }));
    expect(find(unsaved, "Report a problem with this gym")).toBeDefined();
    expect(find(unsaved, "Save this gym")).toBeDefined();
    expect(find(unsaved, "Remove from saved")).toBeUndefined();

    const saved = buildCommands(context({ venue, saved: true }));
    expect(find(saved, "Remove from saved")).toBeDefined();
    expect(find(saved, "Save this gym")).toBeUndefined();
  });

  it("offers Install only when the browser can install the app", () => {
    expect(find(buildCommands(context()), "Install the app")).toBeUndefined();
    const ctx = context({ canInstall: true });
    const install = find(buildCommands(ctx), "Install the app");
    expect(install?.group).toBe("settings");
    install?.run();
    expect(ctx.install).toHaveBeenCalledOnce();
  });

  it("runs each action through the matching context function", () => {
    const ctx = context({ venue });
    const commands = buildCommands(ctx);

    find(commands, "Use my location")?.run();
    expect(ctx.locate).toHaveBeenCalledOnce();

    find(commands, "Add a missing gym")?.run();
    expect(ctx.openReport).toHaveBeenLastCalledWith("add_gym", null);

    find(commands, "Set up my week")?.run();
    expect(ctx.go).toHaveBeenLastCalledWith("/plan/setup");

    find(commands, "Report a problem with this gym")?.run();
    expect(ctx.openReport).toHaveBeenLastCalledWith("wrong_details", venue);

    find(commands, "Save this gym")?.run();
    expect(ctx.toggleSaved).toHaveBeenCalledWith(venue);
  });

  it("switches language to the other one and shows the appearance now in use", () => {
    const english = context();
    const toSwahili = find(buildCommands(english), "Switch to Kiswahili");
    toSwahili?.run();
    expect(english.setLang).toHaveBeenCalledWith("sw");

    const swahili = context({ lang: "sw", tr: (key, vars) => t("sw", key, vars) });
    const toEnglish = buildCommands(swahili).find((command) => command.id === "language");
    expect(toEnglish?.label).toContain("English");
    toEnglish?.run();
    expect(swahili.setLang).toHaveBeenCalledWith("en");

    const dark = context({ theme: "dark" });
    const appearance = find(buildCommands(dark), "Appearance: Dark");
    appearance?.run();
    expect(dark.cycleTheme).toHaveBeenCalledOnce();
    expect(find(buildCommands(context()), "Appearance: Match device")).toBeDefined();
  });

  it("gives every command a unique id and an icon", () => {
    const commands = buildCommands(context({ venue, canInstall: true }));
    expect(new Set(commands.map((command) => command.id)).size).toBe(commands.length);
    for (const command of commands) expect(command.icon).toBeTruthy();
  });
});

describe("rankCommands", () => {
  const all = buildCommands(context({ venue, canInstall: true }));

  it("keeps group order for an empty or blank query and caps each group at eight", () => {
    const empty = rankCommands(all, "");
    expect(rankCommands(all, "   ")).toEqual(empty);
    expect([...new Set(empty.map((command) => command.group))]).toEqual(["actions", "go", "settings"]);
    expect(empty.filter((command) => command.group === "go")).toHaveLength(8);
    expect(empty.filter((command) => command.group === "actions")).toHaveLength(all.filter((command) => command.group === "actions").length);
  });

  it("caps each group at the number asked for", () => {
    const capped = rankCommands(all, "", 2);
    for (const group of ["actions", "go", "settings"] as const) {
      expect(capped.filter((command) => command.group === group).length).toBeLessThanOrEqual(2);
    }
    expect(capped.filter((command) => command.group === "go").map((command) => command.label)).toEqual(["Home", "Find gyms"]);
  });

  it("finds the language command from part of the language name", () => {
    expect(labels(rankCommands(all, "kiswa"))).toEqual(["Switch to Kiswahili"]);
  });

  it("ignores case and accents", () => {
    expect(labels(rankCommands(all, "KÍSWÁ"))).toEqual(["Switch to Kiswahili"]);
  });

  it("puts the closer match first whatever its group, so a page name opens the page", () => {
    expect(labels(rankCommands(all, "week"))).toEqual(["My week", "Set up my week"]);
  });

  it("matches words the label does not hold through keywords", () => {
    expect(labels(rankCommands(all, "dark"))).toEqual(["Appearance: Match device"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(rankCommands(all, "zzzzzz")).toEqual([]);
  });

  it("ranks a label that starts with the query above a word start above a contains or keyword match", () => {
    const make = (id: string, label: string, keywords: string[] = []): Command => ({ id, group: "go", label, icon: Search, keywords, run: () => undefined });
    const list = [make("a", "Open my shop"), make("b", "Shop floor"), make("c", "Workshop"), make("d", "Zebra", ["shop"])];
    expect(rankCommands(list, "shop").map((command) => command.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("does not change the list it is given", () => {
    const before = all.map((command) => command.id);
    rankCommands(all, "week");
    expect(all.map((command) => command.id)).toEqual(before);
  });
});
