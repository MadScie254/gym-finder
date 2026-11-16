import type { TrustTier } from "../data/types";
import styles from "./TrustBadge.module.css";

/** Evidence labels (owner proposal, 2026-11-12): say what was done, not a grade. */
export const TRUST_WORD: Record<TrustTier, string> = {
  verified: "Website checked",
  corroborated: "Matched across sources",
  listed: "Source-listed",
  unconfirmed: "Unconfirmed",
};

/**
 * Each tier has its own shape as well as colour and word:
 * verified = filled roundel with a tick, corroborated = double ring,
 * listed = single ring, unconfirmed = dashed ring.
 */
function Mark({ tier }: { tier: TrustTier }) {
  return (
    <svg className={styles.mark} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      {tier === "verified" && (
        <>
          <circle cx="8" cy="8" r="7.25" fill="currentColor" />
          <path d="M4.9 8.2 7 10.3l4.2-4.4" fill="none" stroke="var(--color-surface)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {tier === "corroborated" && (
        <>
          <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
      {tier === "listed" && <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.8" />}
      {tier === "unconfirmed" && (
        <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.6 2.4" />
      )}
    </svg>
  );
}

export function TrustBadge({ tier, word }: { tier: TrustTier; word?: string }) {
  return (
    <span className={styles.badge} data-tier={tier}>
      <Mark tier={tier} />
      <span>{word ?? TRUST_WORD[tier]}</span>
    </span>
  );
}
