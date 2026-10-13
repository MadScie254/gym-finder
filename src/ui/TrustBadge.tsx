import type { TrustTier } from "../data/types";

const SHORT: Record<TrustTier, string> = {
  verified: "Verified",
  corroborated: "Corroborated",
  listed: "Listed",
  unconfirmed: "Unconfirmed",
};

export function TrustBadge({ tier }: { tier: TrustTier }) {
  return (
    <span className={`pill pill--${tier}`}>
      <span aria-hidden="true">{tier === "verified" ? "●" : tier === "corroborated" ? "◆" : tier === "listed" ? "○" : "?"}</span>
      {SHORT[tier]}
    </span>
  );
}
