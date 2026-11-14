import { useState } from "react";
import { Link } from "react-router";
import { Download, Menu } from "lucide-react";
import { useT, useVenueContext } from "./venue-context";
import { useReport } from "../features/report/report-store";
import { applyTheme, loadTheme, type ThemeChoice } from "../lib/storage";
import type { Lang } from "../lib/i18n";
import { IconButton, Popover } from "../ui";
import styles from "./Shell.module.css";

const THEMES: ThemeChoice[] = ["system", "light", "dark"];
const LANGS: Lang[] = ["en", "sw"];

/** Help, language, appearance, data and privacy: the utility menu, kept out of the primary navigation. */
export function AppMenu({ onInstall }: { onInstall?: () => void }) {
  const tr = useT();
  const { lang, setLang } = useVenueContext();
  const report = useReport();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>(() => loadTheme());
  const close = () => setOpen(false);

  return (
    <Popover
      label={tr("menu")}
      open={open}
      onOpenChange={setOpen}
      align="end"
      trigger={<IconButton icon={Menu} label={tr("menu")} variant="quiet" />}
    >
      <nav className={styles.menu} aria-label={tr("menu")}>
        <ul role="list" className={styles.menuList}>
          <li><Link to="/about/data" onClick={close}>{tr("menuAbout")}</Link></li>
          <li><Link to="/legal" onClick={close}>{tr("menuLegal")}</Link></li>
          <li><Link to="/reports" onClick={close}>{tr("menuReports")}</Link></li>
          <li><button type="button" onClick={() => { close(); report.open("add_gym", null); }}>{tr("menuAddGym")}</button></li>
          {onInstall && <li><button type="button" onClick={() => { close(); onInstall(); }}><Download aria-hidden="true" size={18} />{tr("menuInstall")}</button></li>}
        </ul>
        <div className={styles.menuGroup} role="group" aria-label={tr("menuLanguage")}>
          <span className={styles.menuLabel} aria-hidden="true">{tr("menuLanguage")}</span>
          {LANGS.map((item) => (
            <button key={item} type="button" className={styles.menuToggle} aria-pressed={lang === item} lang={item} onClick={() => setLang(item)}>
              {tr(item === "en" ? "langEnglish" : "langSwahili")}
            </button>
          ))}
        </div>
        {lang === "sw" && <p className={styles.menuNote}>{tr("swahiliDraft")}</p>}
        <div className={styles.menuGroup} role="group" aria-label={tr("menuAppearance")}>
          <span className={styles.menuLabel} aria-hidden="true">{tr("menuAppearance")}</span>
          {THEMES.map((item) => (
            <button key={item} type="button" className={styles.menuToggle} aria-pressed={theme === item} onClick={() => { setTheme(item); applyTheme(item); }}>
              {tr(`theme_${item}`)}
            </button>
          ))}
        </div>
      </nav>
    </Popover>
  );
}
