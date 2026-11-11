import { useMemo, useState } from "react";
import { Bookmark, Globe, Navigation, Phone } from "lucide-react";
import { Link } from "react-router";
import { useVenueContext } from "../../app/venue-context";
import type { TrustTier, Venue } from "../../data/types";
import { directionsUrl, safeTelephoneUrl } from "../../lib/format";
import { ActionRow } from "../../ui/ActionRow";
import type { RowAction } from "../../ui/ActionRow";
import { DistanceBlock } from "../../ui/DistanceBlock";
import { GymCard } from "../../ui/GymCard";
import { TrustBadge } from "../../ui/TrustBadge";
import { Section, sg, Specimen } from "./parts";
import { kmFromCentre, SAMPLE_GYMS } from "./samples";
import type { SampleGym } from "./samples";

const TIERS: TrustTier[] = ["verified", "corroborated", "listed", "unconfirmed"];

function actionsFor(gym: SampleGym, saved: boolean, onSave: () => void): RowAction[] {
  const tel = safeTelephoneUrl(gym.phone);
  return [
    ...(tel ? [{ id: "call", label: "Call", icon: Phone, href: tel }] : []),
    { id: "directions", label: "Directions", icon: Navigation, href: directionsUrl(gym.lat, gym.lng), external: true },
    ...(gym.website ? [{ id: "web", label: "Website", icon: Globe, href: gym.website, external: true }] : []),
    { id: "save", label: saved ? "Saved" : "Save", icon: Bookmark, onClick: onSave, pressed: saved },
  ];
}

function toSample(venue: Venue): SampleGym {
  const place = [...new Set([venue.area, venue.town, venue.county].filter(Boolean))].join(", ");
  return {
    name: venue.name, slug: venue.slug, place, tier: venue.trust.tier, lat: venue.lat, lng: venue.lng,
    phone: venue.phones[0] ?? null, website: venue.website,
  };
}

export function GymSection() {
  const [saved, setSaved] = useState<Record<string, boolean>>({ "salute-gym-179a": true });
  const flip = (slug: string) => setSaved((prev) => ({ ...prev, [slug]: !prev[slug] }));
  const [salute, lystra, hotSports, ogwang] = SAMPLE_GYMS;
  const { index } = useVenueContext();
  // A Verified card only when the loaded catalogue really has a verified gym.
  const verified = useMemo(() => {
    const venue = index?.venues.find((item) => item.trust.tier === "verified");
    return venue ? toSample(venue) : null;
  }, [index]);
  const cards = [...(verified ? [verified] : []), salute, hotSports, ogwang];

  return (
    <Section id="sg-gym" title="Gym pieces" note="Real catalogue rows. Distances are straight-line from central Nairobi.">
      <Specimen title="Trust badge" caption="Shape, mark and word for each tier, never colour alone. Verified comes only from a recorded check in data/overrides.">
        <div className={sg.row}>
          {TIERS.map((tier) => <TrustBadge key={tier} tier={tier} />)}
        </div>
      </Specimen>
      <Specimen title="Distance block" caption="Plate block with condensed numerals. Signal yellow means open now, and appears only when hours are known.">
        <div className={sg.row}>
          <DistanceBlock km={0.46} />
          <DistanceBlock km={kmFromCentre(salute)} />
          <DistanceBlock km={kmFromCentre(hotSports)} />
          <DistanceBlock km={null} />
          <DistanceBlock km={1.2} open />
        </div>
        <div className={sg.row}>
          <DistanceBlock km={kmFromCentre(lystra)} size="detail" />
          <DistanceBlock km={1.2} size="detail" open />
        </div>
        <p className={sg.caption}>The open examples use sample distances and are not tied to a gym.</p>
      </Specimen>
      <Specimen title="Gym card" caption="Verified (when the catalogue has one), selected and saved, thin data with no contact, and unconfirmed.">
        <div className={sg.stack}>
          {cards.map((gym) => (
            <GymCard
              key={gym.slug}
              name={gym.name}
              href={`/gym/${gym.slug}`}
              place={gym.place}
              kind="Gym"
              tier={gym.tier}
              km={kmFromCentre(gym)}
              selected={gym === salute}
              renderLink={({ href, className, children }) => <Link to={href} className={className}>{children}</Link>}
              actions={<ActionRow label={`Contact ${gym.name}`} actions={actionsFor(gym, Boolean(saved[gym.slug]), () => flip(gym.slug))} />}
            />
          ))}
        </div>
        <p className={sg.caption}>{salute.name} is selected (cobalt edge), as when its pin is tapped.</p>
      </Specimen>
      <Specimen title="Action row" caption="One row, 44 px. The first action is primary. In a narrow card the others shrink to icons and keep their names for screen readers.">
        <ActionRow label={`Contact ${salute.name}`} actions={actionsFor(salute, Boolean(saved[salute.slug]), () => flip(salute.slug))} />
        <ActionRow label={`Actions for ${hotSports.name}`} actions={actionsFor(hotSports, false, () => flip(hotSports.slug))} />
        <p className={sg.caption}>{hotSports.name} has no phone or website, so Directions leads.</p>
      </Specimen>
    </Section>
  );
}
