import type { CSSProperties, Ref } from "react";
import { Bookmark, CalendarDays, House, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import styles from "./NavBar.module.css";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Other path prefixes that count as this section, for example "/gym/" for Find gyms. */
  also?: readonly string[];
};

/** Primary sections from the owner's proposal (2026-11-12). The app passes translated labels. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/search", label: "Find gyms", icon: Search, also: ["/in/", "/county/", "/near/", "/gym/", "/compare"] },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/plan", label: "My week", icon: CalendarDays, also: ["/fuel"] },
];

/** A tab that opens something instead of going to a page, such as the menu with every other page in it. */
export type NavBarExtra = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** The page you are on lives behind this tab. Shown, but not claimed as a page for assistive technology. */
  current?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
};

export type NavBarProps = {
  items?: readonly NavItem[];
  /** One more tab after the links, a button that opens a dialog. */
  extra?: NavBarExtra;
  /** "bottom" for the mobile tab bar, "top" for the desktop header. */
  placement?: "bottom" | "top";
  /** Name of the navigation landmark, translated by the app. */
  label?: string;
};

export function isCurrent(item: NavItem, pathname: string): boolean {
  if (item.to === "/") return pathname === "/";
  const prefixes = [item.to, ...(item.also ?? [])];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
}

/** Primary navigation. The current item gets a plate bar and heavier label, not just a colour change. */
export function NavBar({ items = PRIMARY_NAV, extra, placement = "bottom", label = "Primary" }: NavBarProps) {
  const { pathname } = useLocation();
  return (
    <nav className={styles.nav} data-placement={placement} aria-label={label}>
      <ul className={styles.list} role="list" style={{ "--tabs": items.length + (extra ? 1 : 0) } as CSSProperties}>
        {items.map((item) => (
          <li key={item.to} className={styles.item}>
            <Link to={item.to} className={styles.link} aria-current={isCurrent(item, pathname) ? "page" : undefined}>
              <item.icon className={styles.icon} aria-hidden="true" size={22} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
        {extra && (
          <li className={styles.item}>
            <button
              ref={extra.buttonRef}
              type="button"
              className={styles.link}
              aria-haspopup="dialog"
              data-current={extra.current || undefined}
              onClick={extra.onSelect}
            >
              <extra.icon className={styles.icon} aria-hidden="true" size={22} strokeWidth={2} />
              <span>{extra.label}</span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
