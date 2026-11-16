import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { PhotoId } from "../assets/photos";
import { Photo } from "./Photo";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = {
  title: string;
  /** What happened and what to do next. One or two short sentences. */
  children?: ReactNode;
  icon?: LucideIcon;
  /** A picture in place of the icon, for an empty page that invites the person to start. Not for errors. */
  photo?: PhotoId;
  /** Usually one Button. */
  action?: ReactNode;
  /** Heading level, so it fits the page outline. Use 1 when the empty state is the whole page. */
  level?: 1 | 2 | 3;
};

/** The only centred layout in the system. */
export function EmptyState({ title, children, icon: Icon, photo, action, level = 2 }: EmptyStateProps) {
  const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return (
    <section className={styles.empty} data-photo={photo ? "" : undefined}>
      {photo && (
        <div className={styles.picture}>
          <Photo id={photo} sizes="(min-width: 640px) 448px, 100vw" />
        </div>
      )}
      {Icon && !photo && (
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
