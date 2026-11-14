import { useEffect, type ReactNode } from "react";
import { useT } from "./venue-context";
import styles from "./Page.module.css";

/** A plain content page: one left-aligned column, a title, an optional intro line. */
export function Page({ title, intro, actions, children, wide = false }: { title: string; intro?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  const tr = useT();
  useEffect(() => { document.title = `${title}. ${tr("brand")}`; }, [title, tr]);
  return (
    <div className={styles.page} data-wide={wide || undefined}>
      <header className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export const pageStyles = styles;
