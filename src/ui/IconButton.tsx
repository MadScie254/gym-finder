import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./Button.module.css";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  icon: LucideIcon;
  /** Accessible name. Required: there is no visible text. */
  label: string;
  variant?: "secondary" | "quiet";
  /** Set for toggles, such as Save. Leave undefined for plain actions. */
  pressed?: boolean;
};

export function IconButton({ icon: Icon, label, variant = "secondary", pressed, className, type = "button", ...rest }: IconButtonProps) {
  const cls = [styles.button, styles[variant], styles.iconOnly, className ?? ""].filter(Boolean).join(" ");
  return (
    <button {...rest} type={type} className={cls} aria-label={label} aria-pressed={pressed} title={label}>
      <Icon aria-hidden="true" size={22} strokeWidth={2} />
    </button>
  );
}
