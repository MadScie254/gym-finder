import { useId } from "react";
import type { ReactElement, ReactNode } from "react";
import type { TrustTier } from "../data/types";
import { DistanceBlock } from "./DistanceBlock";
import { TrustBadge } from "./TrustBadge";
import styles from "./GymCard.module.css";

export type CardLinkProps = { href: string; className: string; children: ReactNode };

export type GymCardProps = {
  name: string;
  href: string;
  /** Area, town or county, joined with commas. Null shows "Area not listed". */
  place: string | null;
  /** Plain kind label, for example "Gym" or "Martial arts". */
  kind?: string;
  tier: TrustTier;
  km: number | null;
  open?: boolean;
  /** One useful known fact, for example "Day pass KES 1,200" or "Phone listed". */
  fact?: string;
  /** Trust word override, for translations. */
  tierWord?: string;
  selected?: boolean;
  /** Usually an <ActionRow>. Sits outside the link so each action stays its own target. */
  actions?: ReactNode;
  /** Render the name link, for example with a router <Link>. Defaults to <a>. */
  renderLink?: (props: CardLinkProps) => ReactElement;
  /** Heading level of the name, so the card fits the page outline. */
  level?: 2 | 3 | 4;
};

function PlainLink({ href, className, children }: CardLinkProps) {
  return <a href={href} className={className}>{children}</a>;
}

export function GymCard({ name, href, place, kind, tier, km, open, fact, tierWord, selected = false, actions, renderLink = PlainLink, level = 3 }: GymCardProps) {
  const Heading = `h${level}` as const;
  const nameId = useId();
  const where = [place ?? "Area not listed", kind].filter(Boolean).join(", ");
  return (
    <article
      className={styles.card}
      aria-labelledby={nameId}
      aria-current={selected ? "true" : undefined}
      data-selected={selected || undefined}
    >
      <div className={styles.top}>
        {/* No "No location" tile on every card: the block appears once it says something. */}
        {(km != null || open) && <DistanceBlock km={km} open={open} />}
        <div className={styles.body}>
          <Heading className={styles.name} id={nameId}>
            {renderLink({ href, className: styles.link, children: name })}
          </Heading>
          <p className={styles.place}>{where}</p>
          {fact && <p className={styles.fact}>{fact}</p>}
          <TrustBadge tier={tier} word={tierWord} />
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
}
