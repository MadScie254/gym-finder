import { Link, useLocation } from "react-router";
import { X } from "lucide-react";
import { useCompare } from "../../app/stores";
import { useT } from "../../app/venue-context";
import { comparePath } from "../../lib/compare";
import { plural } from "../../lib/i18n";
import styles from "./Compare.module.css";

/** A small, persistent reminder of the compare list, everywhere except the compare page itself. */
export function CompareTray({ wide }: { wide: boolean }) {
  const tr = useT();
  const compare = useCompare();
  const { pathname } = useLocation();
  if (compare.ids.length === 0 || pathname.startsWith("/compare")) return null;
  return (
    <aside className={styles.tray} data-wide={wide || undefined} aria-label={tr("compareTitle")}>
      <span className={styles.trayText}>{plural(tr, compare.ids.length, "trayCountOne", "trayCountMany")}</span>
      <Link to={comparePath(compare.ids)} className={styles.trayLink}>{tr("trayOpen")}</Link>
      <button type="button" className={`${styles.trayClear} ${styles.trayClose}`} aria-label={tr("trayClear")} title={tr("trayClear")} onClick={compare.clear}>
        <X aria-hidden="true" size={22} />
      </button>
    </aside>
  );
}
