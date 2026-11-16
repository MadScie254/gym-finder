import { Languages, LocateFixed, Moon, Search, Sun, SunMoon, type LucideIcon } from "lucide-react";
import { useLocation } from "react-router";
import { preloadPalette, usePalette } from "../features/palette/palette-context";
import { shortcutLabel } from "../features/palette/shortcut";
import { nextTheme, type ThemeChoice } from "../lib/storage";
import { IconButton } from "../ui";
import { pageTitleKey } from "./nav";
import { useTheme } from "./useTheme";
import { useT, useVenueContext } from "./venue-context";
import styles from "./TopBar.module.css";

const THEME_ICON: Record<ThemeChoice, LucideIcon> = { system: SunMoon, light: Sun, dark: Moon };

/**
 * The bar above the page from 1100 px: where you are, one box that finds anything (opens the quick-actions
 * palette), and the three things people reach for most: language, appearance and their location.
 */
export function TopBar() {
  const tr = useT();
  const { lang, setLang, locate } = useVenueContext();
  const { pathname } = useLocation();
  const palette = usePalette();
  const [theme, setTheme] = useTheme();
  const other = lang === "en" ? "sw" : "en";
  const name = (code: "en" | "sw") => tr(code === "en" ? "langEnglish" : "langSwahili");

  return (
    <header className={`${styles.bar} glass`} data-chrome="">
      <p className={styles.title}>{tr(pageTitleKey(pathname))}</p>

      <button
        type="button"
        className={styles.widget}
        aria-haspopup="dialog"
        onClick={palette.show}
        onPointerEnter={preloadPalette}
        onFocus={preloadPalette}
      >
        <Search aria-hidden="true" size={18} strokeWidth={2} />
        <span className={styles.widgetText}>{tr("paletteWidget")}</span>
        <kbd className={styles.kbd}>{shortcutLabel()}</kbd>
      </button>

      <div className={styles.tools}>
        {/* The visible text is the current language code. The name starts with it and then says what a press does,
            so the visible label is part of the name (WCAG 2.5.3). */}
        <button type="button" className={styles.lang} onClick={() => setLang(other)}>
          <Languages aria-hidden="true" size={18} strokeWidth={2} />
          <span>{lang.toUpperCase()}</span>
          <span className="sr-only">: {tr("paletteSwitchLang", { language: name(other) })}</span>
        </button>
        {/* Kiswahili stays marked as a draft until a native speaker has reviewed it. The sentence is the tooltip and the
            screen-reader text; the word is what is seen. */}
        {lang === "sw" && (
          <span className={styles.draft} title={tr("swahiliDraft")}>
            <span aria-hidden="true">{tr("swahiliDraftTag")}</span>
            <span className="sr-only">{tr("swahiliDraft")}</span>
          </span>
        )}
        <IconButton
          icon={THEME_ICON[theme]}
          label={tr("paletteTheme", { theme: tr(`theme_${theme}`) })}
          variant="quiet"
          onClick={() => setTheme(nextTheme(theme))}
        />
        <IconButton icon={LocateFixed} label={tr("locate")} variant="quiet" onClick={locate} />
      </div>
    </header>
  );
}
