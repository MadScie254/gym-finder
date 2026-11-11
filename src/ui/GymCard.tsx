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
  selected?: boolean;
  /** Usually an <ActionRow>. Sits outside the link so each action stays its own target. */
  actions?: ReactNode;
  /** Render the name link, for example with a router <Link>. Defaults to <a>. */
  renderLink?: (props: CardLinkProps) => ReactElement;
};

function PlainLink({ href, className, children }: CardLinkProps) {
  return <a href={href} className={className}>{children}</a>;
}

export function GymCard({ name, href, place, kind, tier, km, open, selected = false, actions, renderLink = PlainLink }: GymCardProps) {
  const nameId = useId();
  const where = [place ?? "Area not listed", kind].filter(Boolean).join(", ");
  return (
    <article className={styles.card} aria-labelledby={nameId} data-selected={selected || undefined}>
      <div className={styles.top}>
        <DistanceBlock km={km} open={open} />
        <div className={styles.body}>
          <h3 className={styles.name} id={nameId}>
            {renderLink({ href, className: styles.link, children: name })}
          </h3>
          <p className={styles.place}>{where}</p>
          <TrustBadge tier={tier} />
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
}
