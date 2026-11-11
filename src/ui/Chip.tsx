import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "./Chip.module.css";

export type ChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** How many results this filter leaves. Shown as tabular numerals. */
  count?: number;
  /** Spoken after the count, for example "gyms". */
  countNoun?: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

/** A toggle filter. Selected chips turn signal yellow and gain a tick, so state never rests on colour alone. */
export function Chip({ label, selected, onToggle, count, countNoun = "gyms", icon: Icon, disabled }: ChipProps) {
  const Lead = selected ? Check : Icon;
  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      {Lead && <Lead className={styles.icon} aria-hidden="true" size={16} strokeWidth={selected ? 2.75 : 2} />}
      <span>{label}</span>
      {count != null && (
        <span className={styles.count} data-zero={count === 0 || undefined}>
          <span className="sr-only">, </span>
          {count}
          <span className="sr-only"> {countNoun}</span>
        </span>
      )}
    </button>
  );
}
