import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet";

type Common = {
  variant?: ButtonVariant;
  /** Lucide icon drawn before the label, or after it with `iconEnd`. Decorative: the label names the action. */
  icon?: LucideIcon;
  /** Draw the icon after the label. */
  iconEnd?: boolean;
  /**
   * Text that replaces the label while the pointer is on the button (once on press where there is no hover).
   * Decorative and hidden from assistive technology: the label stays the name. Never promise an outcome
   * that has not happened yet.
   */
  winLabel?: string;
  /** "fly": the icon flies off the end of the button and comes back from the start while hovered. */
  motion?: "fly";
  /** Stretch to the width of the container. */
  wide?: boolean;
  children: ReactNode;
};

export type ButtonAsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;
export type ButtonAsLink = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Class list for a button look. Use it to style a router <Link> the same way. */
export function buttonClassName(variant: ButtonVariant = "secondary", wide = false, extra?: string): string {
  return [styles.button, styles[variant], wide ? styles.wide : "", extra ?? ""].filter(Boolean).join(" ");
}

function isLink(props: ButtonProps): props is ButtonAsLink {
  return typeof (props as ButtonAsLink).href === "string";
}

function Content({ icon: Icon, iconEnd, winLabel, motion, children }: Pick<Common, "icon" | "iconEnd" | "winLabel" | "motion" | "children">) {
  const glyph = Icon && (
    motion === "fly"
      ? <span className={styles.plane}><Icon className={styles.icon} aria-hidden="true" size={20} strokeWidth={2} /></span>
      : <Icon className={styles.icon} aria-hidden="true" size={20} strokeWidth={2} />
  );
  // Both labels share one grid cell, so the button never changes width when they swap.
  const label = winLabel ? (
    <span className={`${styles.label} ${styles.swap}`}>
      <span className={styles.rest}>{children}</span>
      <span className={styles.win} aria-hidden="true">{winLabel}</span>
    </span>
  ) : (
    <span className={styles.label}>{children}</span>
  );
  return iconEnd ? <>{label}{glyph}</> : <>{glyph}{label}</>;
}

export function Button(props: ButtonProps) {
  if (isLink(props)) {
    const { variant, icon, iconEnd, winLabel, motion, wide, children, className, ...rest } = props;
    return (
      <a {...rest} className={buttonClassName(variant, wide, className)} data-motion={motion}>
        <Content icon={icon} iconEnd={iconEnd} winLabel={winLabel} motion={motion}>{children}</Content>
      </a>
    );
  }
  const { variant, icon, iconEnd, winLabel, motion, wide, children, className, type = "button", ...rest } = props;
  return (
    <button {...rest} type={type} className={buttonClassName(variant, wide, className)} data-motion={motion}>
      <Content icon={icon} iconEnd={iconEnd} winLabel={winLabel} motion={motion}>{children}</Content>
    </button>
  );
}
