import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export type SkeletonProps = { width?: string; height?: string; radius?: "tag" | "card" };

/** A grey placeholder shape. Decorative; wrap a group in <SkeletonList> for the spoken status. */
export function Skeleton({ width = "100%", height = "1em", radius = "tag" }: SkeletonProps) {
  return <span className={styles.bone} data-radius={radius} style={{ width, height } as CSSProperties} aria-hidden="true" />;
}

/** Placeholder with the same footprint as a GymCard, so the list does not jump when data lands. */
export function GymCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton width="80px" height="64px" />
      <div className={styles.lines}>
        <Skeleton width="72%" height="22px" />
        <Skeleton width="48%" height="14px" />
        <Skeleton width="96px" height="22px" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, label = "Loading gyms" }: { count?: number; label?: string }) {
  return (
    <div className={styles.list} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => <GymCardSkeleton key={index} />)}
    </div>
  );
}
