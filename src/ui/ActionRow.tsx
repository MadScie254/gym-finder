import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import styles from "./ActionRow.module.css";

export type RowAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** A link action (tel:, WhatsApp, directions, website). */
  href?: string;
  /** A button action (save, share). Ignored when href is set. */
  onClick?: () => void;
  /** Toggle state, for Save. */
  pressed?: boolean;
  /** Disabled action, for example Compare when three gyms are selected. */
  disabled?: boolean;
  /** Opens another site or app. Adds rel=noopener. */
  external?: boolean;
};

export type ActionRowProps = {
  actions: RowAction[];
  /** Names the group for screen readers, for example "Contact Salute Gym". */
  label: string;
};

/**
 * One row of actions, 44 px tall. The first action is the primary one.
 * In a narrow container the other actions shrink to icons; their labels stay as accessible names.
 */
export function ActionRow({ actions, label }: ActionRowProps) {
  if (actions.length === 0) return null;
  return (
    <div className={styles.frame}>
      <ul className={styles.row} aria-label={label} role="list" data-count={actions.length}>
        {actions.map((action, index) => {
          const variant = index === 0 ? "primary" : "secondary";
          return (
            <li key={action.id} className={styles.item}>
              {action.href ? (
                <Button
                  variant={variant}
                  icon={action.icon}
                  href={action.href}
                  title={action.label}
                  wide
                  {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {action.label}
                </Button>
              ) : (
                <Button variant={variant} icon={action.icon} onClick={action.onClick} aria-pressed={action.pressed} disabled={action.disabled} title={action.label} wide>
                  {action.label}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
