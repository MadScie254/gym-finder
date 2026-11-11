import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet";

type Common = {
  variant?: ButtonVariant;
  /** Lucide icon drawn before the label. Decorative: the label names the action. */
  icon?: LucideIcon;
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

export function Button(props: ButtonProps) {
  const content = (
    <>
      {props.icon && <props.icon className={styles.icon} aria-hidden="true" size={20} strokeWidth={2} />}
      <span className={styles.label}>{props.children}</span>
    </>
  );
  if (isLink(props)) {
    const { variant, icon: _icon, wide, children: _children, className, ...rest } = props;
    return <a {...rest} className={buttonClassName(variant, wide, className)}>{content}</a>;
  }
  const { variant, icon: _icon, wide, children: _children, className, type = "button", ...rest } = props;
  return <button {...rest} type={type} className={buttonClassName(variant, wide, className)}>{content}</button>;
}
