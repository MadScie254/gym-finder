import { useId } from "react";
import { Download, FilePlus } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useReport } from "../features/report/report-store";
import type { Lang } from "../lib/i18n";
import type { ThemeChoice } from "../lib/storage";
import { Button, DemoTag } from "../ui";
import { currentEntry, NAV_GROUPS } from "./nav";
import { useSaved } from "./stores";
import { useTheme } from "./useTheme";
import { useT, useVenueContext } from "./venue-context";
import styles from "./MenuContent.module.css";

const THEMES: ThemeChoice[] = ["system", "light", "dark"];
const LANGS: Lang[] = ["en", "sw"];

export type MenuContentProps = {
  /** Called when the person goes somewhere or starts something, so the menu around this can close. */
  onNavigate: () => void;
  /** Present only when the browser can install the app. */
  onInstall?: () => void;
};

/**
 * Every page, then the settings. It is the menu on phones (the More tab) and on tablets (the header menu), and
 * lists exactly what the desktop sidebar lists, from the same nav model, so no page is only reachable on a big screen.
 */
export function MenuContent({ onNavigate, onInstall }: MenuContentProps) {
  const tr = useT();
  const { lang, setLang } = useVenueContext();
  const { pathname } = useLocation();
  const saved = useSaved();
  const report = useReport();
  const [theme, setTheme] = useTheme();
  const base = useId();
  const active = currentEntry(pathname);
  const savedCount = saved.entries.length;

  return (
    <div className={styles.menu}>
      <nav aria-label={tr("menu")} className={styles.pages}>
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className={styles.group}>
            <p id={`${base}-${group.id}`} className={styles.groupLabel}>{tr(group.labelKey)}</p>
            <ul role="list" aria-labelledby={`${base}-${group.id}`} className={styles.list}>
              {group.items.map((entry) => (
                <li key={entry.id}>
                  <Link to={entry.to} className={styles.item} aria-current={active?.id === entry.id ? "page" : undefined} onClick={onNavigate}>
                    <entry.icon className={styles.icon} aria-hidden="true" size={22} strokeWidth={2} />
                    <span className={styles.label}>{tr(entry.labelKey)}</span>
                    {entry.count === "saved" && savedCount > 0 && (
                      <span className={styles.count}>
                        <span aria-hidden="true">{savedCount}</span>
                        <span className="sr-only">, {tr("paletteSavedHint", { n: savedCount })}</span>
                      </span>
                    )}
                    {entry.tag === "demo" && <span className={styles.tag}><DemoTag /></span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.settings}>
        <div className={styles.toggles} role="group" aria-label={tr("menuLanguage")}>
          <span className={styles.toggleLabel} aria-hidden="true">{tr("menuLanguage")}</span>
          {LANGS.map((item) => (
            <button key={item} type="button" className={styles.toggle} aria-pressed={lang === item} lang={item} onClick={() => setLang(item)}>
              {tr(item === "en" ? "langEnglish" : "langSwahili")}
            </button>
          ))}
        </div>
        {lang === "sw" && <p className={styles.note}>{tr("swahiliDraft")}</p>}
        <div className={styles.toggles} role="group" aria-label={tr("menuAppearance")}>
          <span className={styles.toggleLabel} aria-hidden="true">{tr("menuAppearance")}</span>
          {THEMES.map((item) => (
            <button key={item} type="button" className={styles.toggle} aria-pressed={theme === item} onClick={() => setTheme(item)}>
              {tr(`theme_${item}`)}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" icon={FilePlus} onClick={() => { onNavigate(); report.open("add_gym", null); }}>{tr("menuAddGym")}</Button>
          {onInstall && <Button variant="secondary" icon={Download} onClick={() => { onNavigate(); onInstall(); }}>{tr("menuInstall")}</Button>}
        </div>
      </div>
    </div>
  );
}
