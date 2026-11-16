import { useState } from "react";
import { Languages, LocateFixed, Moon, Search, Sun, SunMoon, type LucideIcon } from "lucide-react";
import { useLocation } from "react-router";
import { preloadPalette, usePalette } from "../features/palette/palette-context";
import { shortcutLabel } from "../features/palette/shortcut";
import { applyTheme, loadTheme, nextTheme, type ThemeChoice } from "../lib/storage";
import { IconButton } from "../ui";
import { pageTitleKey } from "./nav";
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
  const [theme, setTheme] = useState<ThemeChoice>(() => loadTheme());
  const other = lang === "en" ? "sw" : "en";
  const name = (code: "en" | "sw") => tr(code === "en" ? "langEnglish" : "langSwahili");

  return (
    <header className={`${styles.bar} glass`}>
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
        {/* The visible text is the current language code; the name carries the language and the action. */}
        <button
          type="button"
          className={styles.lang}
          aria-label={`${name(lang)}. ${tr("paletteSwitchLang", { language: name(other) })}`}
          onClick={() => setLang(other)}
        >
          <Languages aria-hidden="true" size={18} strokeWidth={2} />
          <span aria-hidden="true">{lang.toUpperCase()}</span>
        </button>
        <IconButton
          icon={THEME_ICON[theme]}
          label={tr("paletteTheme", { theme: tr(`theme_${theme}`) })}
          variant="quiet"
          onClick={() => {
            const next = nextTheme(theme);
            applyTheme(next);
            setTheme(next);
          }}
        />
        <IconButton icon={LocateFixed} label={tr("locate")} variant="quiet" onClick={locate} />
      </div>
    </header>
  );
}
