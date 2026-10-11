import type { TrustTier } from "../data/types";
import { t, type Lang } from "../lib/i18n";

const LABEL: Record<TrustTier, "verified" | "corroborated" | "listed" | "unconfirmed"> = {
  verified: "verified",
  corroborated: "corroborated",
  listed: "listed",
  unconfirmed: "unconfirmed",
};

export function TrustBadge({
  tier,
  reasons,
  lang,
  verifiedAt,
}: {
  tier: TrustTier;
  reasons: string[];
  lang: Lang;
  verifiedAt?: string | null;
}) {
  const label = tier === "verified" && verifiedAt
    ? `${t(lang, "verified")} · ${verifiedAt}`
    : t(lang, LABEL[tier]);
  return (
    <details className="trust-badge">
      <summary className={`trust-badge__label trust-badge__label--${tier}`}>
        <span aria-hidden="true">{tier === "verified" ? "●" : tier === "corroborated" ? "◆" : tier === "listed" ? "○" : "?"}</span>
        {label}
      </summary>
      <p>{reasons.join(" · ")}</p>
    </details>
  );
}
