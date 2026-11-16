import type { ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import styles from "./Accordion.module.css";

/** A bordered group of folded sections. Each item opens on its own. */
export function Accordion({ children }: { children: ReactNode }) {
  return <div className={styles.group}>{children}</div>;
}

export type AccordionItemProps = {
  title: ReactNode;
  /** Decorative: the title names the section. */
  icon?: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * One folded section on native <details>, so it works without JavaScript and keyboard
 * and screen-reader behaviour come from the browser. Fold what people need less often.
 */
export function AccordionItem({ title, icon: Icon, defaultOpen, children }: AccordionItemProps) {
  return (
    <details className={styles.item} open={defaultOpen}>
      <summary className={styles.summary}>
        {Icon && <Icon className={styles.icon} aria-hidden="true" size={18} strokeWidth={2} />}
        <span className={styles.title}>{title}</span>
        <ChevronDown className={styles.chevron} aria-hidden="true" size={18} strokeWidth={2} />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
