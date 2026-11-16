import { useId } from "react";
import { Download, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, useLocation } from "react-router";
import { formatDate } from "../lib/i18n";
import { Button, DemoTag, IconButton } from "../ui";
import { currentEntry, NAV_GROUPS } from "./nav";
import { usePwa } from "./pwa";
import { useSaved } from "./stores";
import { useOfflineReady } from "./useOfflineReady";
import { useT, useVenueContext } from "./venue-context";
import styles from "./Sidebar.module.css";

export type SidebarProps = {
  /** A narrow rail with icons only. Every entry keeps its name for assistive technology. */
  collapsed: boolean;
  onToggle: () => void;
};

/**
 * The left sidebar from 1100 px: every page in three labelled groups, the offline status, the date of the
 * gym list and Install. It sits beside the page and never over it, so its glass is only ever drawn over the
 * page background.
 */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const tr = useT();
  const { index, lang, offline } = useVenueContext();
  const { pathname } = useLocation();
  const saved = useSaved();
  const pwa = usePwa();
  const offlineReady = useOfflineReady();
  const base = useId();
  const active = currentEntry(pathname);
  const savedCount = saved.entries.length;
  const date = index ? formatDate(lang, index.manifest.builtAt) : "";
  // "Works offline" is good news and gets the green dot. A connection that is down gets the plain wording and no colour.
  const status = offlineReady
    ? { text: tr("offlineReady"), ready: true }
    : offline ? { text: index ? tr("offlineBanner", { date }) : tr("offlineNoData"), ready: false } : null;

  return (
    <aside className={`${styles.side} glass`} data-chrome="" data-collapsed={collapsed || undefined}>
      <div className={styles.head}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.wordmark}>{tr("brand")}</span>
        </Link>
        <IconButton
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label={tr(collapsed ? "sidebarExpand" : "sidebarCollapse")}
          variant="quiet"
          aria-expanded={!collapsed}
          onClick={onToggle}
        />
      </div>

      <nav aria-label={tr("navPrimary")} className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className={styles.group}>
            <p id={`${base}-${group.id}`} className={styles.groupLabel}>{tr(group.labelKey)}</p>
            <ul role="list" aria-labelledby={`${base}-${group.id}`} className={styles.list}>
              {group.items.map((entry) => {
                const label = tr(entry.labelKey);
                return (
                  <li key={entry.id}>
                    <Link
                      to={entry.to}
                      className={styles.item}
                      aria-current={active?.id === entry.id ? "page" : undefined}
                      title={collapsed ? label : undefined}
                    >
                      <entry.icon className={styles.icon} aria-hidden="true" size={20} strokeWidth={2} />
                      <span className={styles.label}>{label}</span>
                      {entry.count === "saved" && savedCount > 0 && (
                        <span className={styles.count}>
                          <span aria-hidden="true">{savedCount}</span>
                          <span className="sr-only">, {tr("paletteSavedHint", { n: savedCount })}</span>
                        </span>
                      )}
                      {entry.tag === "demo" && <span className={styles.tag}><DemoTag /></span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.foot}>
        {status && (
          <p className={styles.status}>
            <span className={styles.dot} data-ready={status.ready || undefined} aria-hidden="true" />
            <span className={styles.statusText}>{status.text}</span>
          </p>
        )}
        {date && <p className={styles.listDate}>{tr("gymListFrom", { date })}</p>}
        {pwa.canInstall && (collapsed
          ? <IconButton icon={Download} label={tr("menuInstall")} onClick={() => { void pwa.install(); }} />
          : <Button variant="secondary" icon={Download} wide onClick={() => { void pwa.install(); }}>{tr("menuInstall")}</Button>)}
      </div>
    </aside>
  );
}
