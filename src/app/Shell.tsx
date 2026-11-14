import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { AppMenu } from "./AppMenu";
import { usePwa } from "./pwa";
import { useMediaQuery, WIDE_QUERY } from "./useMediaQuery";
import { useT, useVenueContext } from "./venue-context";
import { formatDate } from "../lib/i18n";
import { applyTheme, loadTheme } from "../lib/storage";
import { Banner, NavBar, PRIMARY_NAV, type NavItem } from "../ui";
import styles from "./Shell.module.css";

const LABELS = ["navHome", "navFind", "navSaved", "navWeek"] as const;
const DISCOVERY = /^\/(search|in\/|county\/|near\/)/;

/** Header with the compact top navigation (desktop) or a bottom bar (phones), app-wide notices, and the page. */
export function Shell() {
  const tr = useT();
  const { offline, index, lang } = useVenueContext();
  const { pathname } = useLocation();
  const wide = useMediaQuery(WIDE_QUERY);
  const pwa = usePwa();
  const discovery = DISCOVERY.test(pathname);
  const items: NavItem[] = PRIMARY_NAV.map((item, i) => ({ ...item, label: tr(LABELS[i]) }));

  useEffect(() => { applyTheme(loadTheme(), false); }, []);
  useEffect(() => { if (!discovery && !pathname.startsWith("/gym/")) document.title = tr("brand"); }, [pathname, discovery, tr]);

  return (
    <div className={styles.app} data-discovery={discovery || undefined}>
      <a className={styles.skip} href="#main">{tr("skipToContent")}</a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>{tr("brand")}</Link>
        {wide && <NavBar items={items} placement="top" />}
        <AppMenu onInstall={pwa.canInstall ? pwa.install : undefined} />
      </header>
      {offline && (
        <Banner kind="offline">
          {index ? tr("offlineBanner", { date: formatDate(lang, index.manifest.builtAt) }) : tr("offlineNoData")}
        </Banner>
      )}
      {pwa.updateReady && <Banner kind="update" action={{ label: tr("updateReload"), onClick: pwa.applyUpdate }}>{tr("updateReady")}</Banner>}
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      {!wide && <div className={styles.bottom}><NavBar items={items} placement="bottom" /></div>}
    </div>
  );
}
