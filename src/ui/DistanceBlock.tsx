import { formatDistanceParts } from "../lib/format";
import styles from "./DistanceBlock.module.css";

export type DistanceBlockProps = {
  /** Straight-line distance in km, or null when the visitor's location is unknown. */
  km: number | null;
  /** Open now, from listed hours. Only pass true when hours are known. */
  open?: boolean;
  size?: "card" | "detail";
};

/**
 * The signature element: a plate-coloured block with large condensed numerals,
 * read like the markings on an iron plate. It turns signal yellow when open.
 */
export function DistanceBlock({ km, open = false, size = "card" }: DistanceBlockProps) {
  const parts = km == null ? null : formatDistanceParts(km);
  const spoken = parts
    ? `${parts.value} ${parts.unit === "km" ? "kilometres" : "metres"} away in a straight line`
    : "Distance unknown until you share a location";
  return (
    <span className={styles.block} data-size={size} data-open={open || undefined}>
      <span className="sr-only">{spoken}{open ? ". Open now" : ""}</span>
      <span className={styles.reading} aria-hidden="true">
        {parts ? (
          <>
            <span className={styles.value}>{parts.value}</span>
            <span className={styles.unit}>{parts.unit}</span>
          </>
        ) : (
          <span className={styles.unknown}>No location</span>
        )}
      </span>
      {(open || size === "detail") && (
        <span className={styles.caption} aria-hidden="true">
          {open ? "Open now" : "Straight line"}
        </span>
      )}
    </span>
  );
}
