import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { usePlanCopy } from "./strings";
import styles from "./Plan.module.css";

const TABS = [
  { to: "/plan", key: "today", end: true },
  { to: "/plan/week", key: "week", end: false },
  { to: "/plan/meals", key: "meals", end: false },
  { to: "/plan/shopping", key: "shopping", end: false },
] as const;

/** Frame for every My week screen: one title and the four sections. */
export function MyWeekScreen({ children, title }: { children: ReactNode; title?: string }) {
  const { copy } = usePlanCopy();
  return (
    <div className={styles.screen}>
      <div className={styles.frame}>
        <h1 className={styles.title}>{title ?? copy.myWeek}</h1>
        <nav className={styles.tabs} aria-label={copy.sectionsLabel} data-print="hide">
          {TABS.map((tab) => (
            <NavLink key={tab.key} to={tab.to} end={tab.end} className={styles.tab}>
              {copy.tabs[tab.key]}
            </NavLink>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
