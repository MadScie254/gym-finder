import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { LayoutGrid, Search } from "lucide-react";
import { AppMenu } from "./AppMenu";
import { MenuContent } from "./MenuContent";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { usePwa } from "./pwa";
import { SIDEBAR_EXPANDED_QUERY, SIDEBAR_QUERY, useMediaQuery, WIDE_QUERY } from "./useMediaQuery";
import { usePageScroll } from "./usePageScroll";
import { useT, useVenueContext } from "./venue-context";
import { formatDate } from "../lib/i18n";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "../lib/storage";
import { CompareTray } from "../features/compare/CompareTray";
import { preloadPalette, usePalette } from "../features/palette/palette-context";
import { Banner, Dialog, IconButton, NavBar, PRIMARY_NAV, type NavItem } from "../ui";
import { isCurrent } from "../ui/NavBar";
import styles from "./Shell.module.css";

const LABELS = ["navHome", "navFind", "navSaved", "navWeek"] as const;
const DISCOVERY = /^\/(search|in\/|county\/|near\/)/;

/**
 * App chrome in three modes. From 1100 px a glass sidebar and top bar sit beside the page. From 900 px the
 * header carries the compact top navigation. Below that, a header and bottom tabs. App-wide notices and the
 * page are the same in all three, so resizing across a breakpoint keeps the page where it is.
 */
export function Shell() {
  const tr = useT();
  const { offline, index, lang } = useVenueContext();
  const { pathname } = useLocation();
  const sidebarMode = useMediaQuery(SIDEBAR_QUERY);
  const wide = useMediaQuery(WIDE_QUERY);
  const expandedByWidth = useMediaQuery(SIDEBAR_EXPANDED_QUERY);
  const [choice, setChoice] = useState<boolean | null>(() => loadSidebarCollapsed());
  const collapsed = choice ?? !expandedByWidth;
  const palette = usePalette();
  const pwa = usePwa();
  const main = useRef<HTMLElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  // Where focus goes when the More sheet closes: onto the page after a page was chosen, back on the tab after it was dismissed.
  const chose = useRef(false);
  const discovery = DISCOVERY.test(pathname);
  const items: NavItem[] = PRIMARY_NAV.map((item, i) => ({ ...item, label: tr(LABELS[i]) }));
  // The four tabs cannot hold every page, so More is where you are when none of them is.
  const moreIsCurrent = !items.some((item) => isCurrent(item, pathname));
  const install = pwa.canInstall ? () => { void pwa.install(); } : undefined;

  useEffect(() => { if (!discovery && !pathname.startsWith("/gym/")) document.title = tr("brand"); }, [pathname, discovery, tr]);
  usePageScroll(main, sidebarMode);

  function toggleSidebar() {
    setChoice(!collapsed);
    saveSidebarCollapsed(!collapsed);
  }

  return (
    <div
      className={styles.app}
      data-mode={sidebarMode ? "sidebar" : wide ? "top" : "bottom"}
      data-collapsed={(sidebarMode && collapsed) || undefined}
      data-discovery={discovery || undefined}
    >
      <a className={styles.skip} href="#main">{tr("skipToContent")}</a>
      {sidebarMode && <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />}
      <div className={styles.column}>
        {sidebarMode ? (
          <TopBar />
        ) : (
          <header className={styles.header}>
            <Link to="/" className={styles.brand}>{tr("brand")}</Link>
            {wide && <NavBar items={items} placement="top" label={tr("navPrimary")} />}
            <div className={styles.actions}>
              <IconButton icon={Search} label={tr("searchOpen")} variant="quiet" onClick={palette.show} onPointerEnter={preloadPalette} />
              {wide && <AppMenu onInstall={install} />}
            </div>
          </header>
        )}
        {offline && (
          <Banner kind="offline">
            {index ? tr("offlineBanner", { date: formatDate(lang, index.manifest.builtAt) }) : tr("offlineNoData")}
          </Banner>
        )}
        {pwa.updateReady && <Banner kind="update" action={{ label: tr("updateReload"), onClick: pwa.applyUpdate }}>{tr("updateReady")}</Banner>}
        <main id="main" ref={main} className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      {wide && <CompareTray wide />}
      {!wide && (
        <div className={styles.bottom}>
          <CompareTray wide={false} />
          <NavBar
            items={items}
            placement="bottom"
            label={tr("navPrimary")}
            extra={{ label: tr("navMore"), icon: LayoutGrid, onSelect: () => setMoreOpen(true), current: moreIsCurrent, buttonRef: moreButton }}
          />
        </div>
      )}
      {!wide && (
        <Dialog
          title={tr("menu")}
          open={moreOpen}
          onOpenChange={(next) => { if (next) chose.current = false; setMoreOpen(next); }}
          returnFocus={() => (chose.current ? main.current : moreButton.current)}
        >
          <MenuContent onNavigate={() => { chose.current = true; setMoreOpen(false); }} onInstall={install} />
        </Dialog>
      )}
    </div>
  );
}
