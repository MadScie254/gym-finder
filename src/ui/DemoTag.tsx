import styles from "./DemoTag.module.css";

/**
 * The visible marker for simulated content (docs/REVAMP_PLAN.md section 2.1).
 * Put it on every simulated screen, store and sample item. Never on gym data.
 */
export function DemoTag({ detail = "sample data, not a live service" }: { detail?: string }) {
  return (
    <span className={styles.tag}>
      Demo<span className="sr-only">, {detail}</span>
    </span>
  );
}
