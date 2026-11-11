import type { ReactNode } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { DemoTag } from "./DemoTag";
import styles from "./Banner.module.css";

export type BannerKind = "offline" | "demo" | "update";

export type BannerProps = {
  kind: BannerKind;
  children: ReactNode;
  /** One optional action, for example a Reload button on "update". */
  action?: { label: string; onClick: () => void };
};

/** A full-width notice about the state of the app, not about one gym. */
export function Banner({ kind, children, action }: BannerProps) {
  return (
    <div className={styles.banner} data-kind={kind} role="status">
      {kind === "offline" && <WifiOff className={styles.icon} aria-hidden="true" size={20} strokeWidth={2} />}
      {kind === "update" && <RefreshCw className={styles.icon} aria-hidden="true" size={20} strokeWidth={2} />}
      {kind === "demo" && <DemoTag />}
      <p className={styles.text}>{children}</p>
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}
