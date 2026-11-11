import { useState } from "react";
import { MapPinOff, SearchX } from "lucide-react";
import { Banner } from "../../ui/Banner";
import { Button } from "../../ui/Button";
import { DemoTag } from "../../ui/DemoTag";
import { EmptyState } from "../../ui/EmptyState";
import { GymCardSkeleton, Skeleton } from "../../ui/Skeleton";
import { Section, sg, Specimen } from "./parts";

export function FeedbackSection() {
  const [reloads, setReloads] = useState(0);
  return (
    <Section id="sg-feedback" title="Feedback and status">
      <Specimen title="Banner" caption="App-wide notices. Offline and update carry an icon; demo carries the Demo tag.">
        <div className={sg.stack}>
          <Banner kind="offline">Offline. Showing the gym list from 5 Nov 2026.</Banner>
          <Banner kind="update" action={{ label: "Reload", onClick: () => setReloads(reloads + 1) }}>
            A newer gym list is ready.
          </Banner>
          <Banner kind="demo">Demo stores and sample menus. Ordering is not live yet.</Banner>
        </div>
      </Specimen>
      <Specimen title="Demo tag" caption="Marks anything simulated. Never used on gym data.">
        <div className={sg.row}>
          <DemoTag />
          <span>Demo: Protein Kitchen, Westlands</span>
        </div>
      </Specimen>
      <Specimen title="Skeleton" caption="Used instead of a spinner. Same footprint as the card it stands for. Still under reduced motion.">
        <div className={sg.stack}>
          <GymCardSkeleton />
          <Skeleton width="60%" height="14px" />
        </div>
      </Specimen>
      <Specimen title="Empty state" caption="The only centred layout. Says what happened and what to do next.">
        <EmptyState
          level={3}
          icon={SearchX}
          title="No gyms match"
          action={<Button variant="secondary">Clear filters</Button>}
        >
          <p>No yoga studio is listed within 5 km of Umoja. Widen the distance or clear filters.</p>
        </EmptyState>
        <EmptyState level={3} icon={MapPinOff} title="No gyms listed in Marsabit yet">
          <p>Our map sources list no gym in this county. Know one? Tell us and we will check it.</p>
        </EmptyState>
      </Specimen>
    </Section>
  );
}
