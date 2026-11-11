import { Bookmark, CalendarDays, Dumbbell, Salad } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import styles from "./NavBar.module.css";

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const PRIMARY_NAV: readonly NavItem[] = [
  { to: "/", label: "Gyms", icon: Dumbbell },
  { to: "/fuel", label: "Fuel", icon: Salad },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/saved", label: "Saved", icon: Bookmark },
];

export type NavBarProps = {
  items?: readonly NavItem[];
  /** "bottom" for the mobile tab bar, "top" for the desktop rail header. */
  placement?: "bottom" | "top";
};

/** Primary navigation. The current item gets a plate bar and heavier label, not just a colour change. */
export function NavBar({ items = PRIMARY_NAV, placement = "bottom" }: NavBarProps) {
  return (
    <nav className={styles.nav} data-placement={placement} aria-label="Primary">
      <ul className={styles.list} role="list">
        {items.map((item) => (
          <li key={item.to} className={styles.item}>
            <NavLink to={item.to} end={item.to === "/"} className={styles.link}>
              <item.icon className={styles.icon} aria-hidden="true" size={22} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
