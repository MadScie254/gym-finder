import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = {
  title: string;
  /** What happened and what to do next. One or two short sentences. */
  children?: ReactNode;
  icon?: LucideIcon;
  /** Usually one Button. */
  action?: ReactNode;
  /** Heading level, so it fits the page outline. */
  level?: 2 | 3;
};

/** The only centred layout in the system. */
export function EmptyState({ title, children, icon: Icon, action, level = 2 }: EmptyStateProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section className={styles.empty}>
      {Icon && (
        <span className={styles.mark} aria-hidden="true">
          <Icon size={28} strokeWidth={2} />
        </span>
      )}
      <Heading className={styles.title}>{title}</Heading>
      {children && <div className={styles.body}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </section>
  );
}
