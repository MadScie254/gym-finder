import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { CornerDownLeft, Dumbbell, History, Landmark as LandmarkIcon, Map as MapIcon, MapPin, Search, X, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { usePwa } from "../../app/pwa";
import { useSaved } from "../../app/stores";
import { useMediaQuery, WIDE_QUERY } from "../../app/useMediaQuery";
import { useT, useVenueContext } from "../../app/venue-context";
import { foldPlace } from "../../lib/filterVenues";
import type { CopyKey } from "../../lib/i18n";
import { loadLandmarks, type Landmark } from "../../lib/landmarks";
import { buildSuggestions, type SuggestionKind } from "../../lib/searchModel";
import { applyTheme, loadRecentSearches, loadTheme, nextTheme, saveRecentSearch } from "../../lib/storage";
import { NO_FILTERS, queryString, writeFilters } from "../../lib/urlState";
import { DemoTag } from "../../ui/DemoTag";
import { IconButton } from "../../ui/IconButton";
import { useReport } from "../report/report-store";
import { buildCommands, matchScore, rankCommands, type CommandContext, type CommandGroup } from "./commands";
import styles from "./Palette.module.css";

type Row = { label: string; hint?: string; icon: LucideIcon; tag?: "demo"; run: () => void };
type Section = { id: string; label: string; rows: Row[] };

const SUGGESTION_ICON: Record<SuggestionKind, LucideIcon> = {
  recent: History,
  gyms: Dumbbell,
  areas: MapPin,
  landmarks: LandmarkIcon,
  counties: MapIcon,
};

const GROUP_LABEL: Record<CommandGroup, CopyKey> = {
  actions: "paletteGroupActions",
  go: "paletteGroupGo",
  settings: "paletteGroupSettings",
};

/**
 * The quick-actions palette: one box for gyms, places, actions, pages and settings. A centred glass panel from
 * 900 px, a full-height solid sheet below. ARIA 1.2 combobox: focus stays in the field and the highlighted row
 * is named by aria-activedescendant.
 */
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const tr = useT();
  const { index, lang, setLang, locate } = useVenueContext();
  const saved = useSaved();
  const report = useReport();
  const { canInstall, install } = usePwa();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const wide = useMediaQuery(WIDE_QUERY);
  const base = useId();
  const listId = `${base}-list`;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [recent] = useState(() => loadRecentSearches());
  const [theme, setTheme] = useState(() => loadTheme());
  // Radix hands focus back to its trigger, and this dialog has none, so keep the opener here. Read before
  // Radix moves focus into the field.
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  // Set when a command hands the screen to another dialog, so focus is not pulled back to the opener.
  const handoff = useRef(false);

  useEffect(() => {
    let live = true;
    loadLandmarks().then((rows) => { if (live) setLandmarks(rows); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const slug = /^\/gym\/([^/]+)/.exec(pathname)?.[1];
  const venue = (slug && index?.bySlug.get(slug)) || null;

  const suggestions = useMemo(
    () => buildSuggestions({ index, landmarks, query, recent, tr })
      .filter((group) => group.options.length > 0 && (group.id !== "recent" || query.trim() === "")),
    [index, landmarks, query, recent, tr],
  );

  const text = query.trim();

  const context: CommandContext = {
    tr, lang, theme, venue,
    saved: venue ? saved.isSaved(venue.id) : false,
    savedCount: saved.entries.length,
    canInstall,
    go: (to) => navigate(to),
    locate,
    setLang,
    cycleTheme: () => {
      const next = nextTheme(theme);
      applyTheme(next);
      setTheme(next);
    },
    install: () => { void install(); },
    openReport: (kind, target) => {
      handoff.current = true;
      report.open(kind, target);
    },
    toggleSaved: (target) => saved.toggle(target),
  };

  const folded = foldPlace(query);

  const suggestionSections: Section[] = suggestions.map((group) => ({
    id: group.id,
    label: group.label,
    rows: group.options.map((option) => ({
      label: option.label,
      hint: option.hint,
      icon: SUGGESTION_ICON[group.id],
      run: () => {
        saveRecentSearch({ label: option.label, href: option.href });
        navigate(option.href);
      },
    })),
  }));

  const commandSections: Section[] = [];
  let bestCommand = 0;
  for (const command of rankCommands(buildCommands(context), query)) {
    let section = commandSections.find((row) => row.id === command.group);
    if (!section) {
      section = { id: command.group, label: tr(GROUP_LABEL[command.group]), rows: [] };
      commandSections.push(section);
    }
    section.rows.push({ label: command.label, hint: command.hint, icon: command.icon, tag: command.tag, run: command.run });
    if (folded) bestCommand = Math.max(bestCommand, matchScore(command.label, command.keywords, folded));
  }

  // Gyms and places come first, unless a command matches strictly better than all of them. Typing an action in
  // words ("add a missing gym") fuzzy-matches gym names through its short words, and Enter must not open one.
  // A suggestion the search returned matches at least loosely, so it scores 1 even when its label holds no part
  // of the query.
  const bestSuggestion = folded
    ? Math.max(0, ...suggestions.flatMap((group) => group.options.map((option) => Math.max(1, matchScore(option.label, [], folded)))))
    : 0;
  const sections = bestCommand > bestSuggestion ? [...commandSections, ...suggestionSections] : [...suggestionSections, ...commandSections];
  const nothing = text !== "" && sections.length === 0;

  const searchAll: Row | null = text === "" ? null : {
    label: tr("paletteSearchAll", { q: text }),
    icon: Search,
    run: () => {
      const href = `/search${queryString(writeFilters({ ...NO_FILTERS, q: text }))}`;
      saveRecentSearch({ label: text, href });
      navigate(href);
    },
  };

  const flat: Row[] = [...sections.flatMap((section) => section.rows), ...(searchAll ? [searchAll] : [])];
  const activeIndex = Math.min(active, flat.length - 1);
  const optionId = (i: number) => `${base}-opt-${i}`;
  const activeId = flat.length > 0 ? optionId(activeIndex) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  function choose(i: number) {
    const row = flat[i];
    if (!row) return;
    onClose();
    row.run();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || flat.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
    }
  }

  function renderRow(row: Row, i: number) {
    const Icon = row.icon;
    return (
      <div
        key={optionId(i)}
        id={optionId(i)}
        role="option"
        aria-selected={i === activeIndex}
        className={styles.row}
        onMouseDown={(event) => event.preventDefault()}
        onMouseMove={() => setActive(i)}
        onClick={() => choose(i)}
      >
        <Icon className={styles.rowIcon} aria-hidden="true" size={20} strokeWidth={2} />
        <span className={styles.rowText}>
          <span className={styles.rowLabel}>{row.label}</span>
          {row.hint && <span className={styles.rowHint}>{row.hint}</span>}
        </span>
        {row.tag === "demo" && <DemoTag />}
        <CornerDownLeft className={styles.rowEnter} aria-hidden="true" size={16} strokeWidth={2} />
      </div>
    );
  }

  let next = 0;

  return (
    <RadixDialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.scrim} />
        <RadixDialog.Content
          data-palette=""
          data-variant={wide ? "modal" : "sheet"}
          data-strength="strong"
          data-surface="modal"
          className={`${styles.panel} glass`}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!handoff.current && opener?.isConnected) opener.focus();
          }}
        >
          <RadixDialog.Title className="sr-only">{tr("paletteTitle")}</RadixDialog.Title>
          <div className={styles.search}>
            <Search className={styles.lead} aria-hidden="true" size={22} strokeWidth={2} />
            <input
              className={styles.input}
              type="text"
              role="combobox"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-label={tr("palettePlaceholder")}
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              placeholder={tr(wide ? "palettePlaceholder" : "paletteWidget")}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
            />
            {!wide && (
              <RadixDialog.Close asChild>
                <IconButton icon={X} label={tr("paletteClose")} variant="quiet" />
              </RadixDialog.Close>
            )}
          </div>
          <p role="status" className={nothing ? styles.empty : "sr-only"}>
            {nothing ? tr("paletteEmpty") : flat.length > 0 ? tr("searchSuggestions", { n: flat.length }) : ""}
          </p>
          <div id={listId} role="listbox" aria-label={tr("paletteTitle")} className={styles.list}>
            {sections.map((section) => (
              <div key={section.id} role="group" aria-labelledby={`${base}-g-${section.id}`} className={styles.group}>
                <div role="presentation" id={`${base}-g-${section.id}`} className={styles.groupLabel}>{section.label}</div>
                {section.rows.map((row) => renderRow(row, next++))}
              </div>
            ))}
            {searchAll && renderRow(searchAll, next++)}
          </div>
          {wide && (
            <div className={styles.hints} aria-hidden="true">
              <span><kbd>↑</kbd> <kbd>↓</kbd> {tr("paletteHintMove")}</span>
              <span><kbd>↵</kbd> {tr("paletteHintOpen")}</span>
              <span><kbd>esc</kbd> {tr("paletteHintClose")}</span>
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
