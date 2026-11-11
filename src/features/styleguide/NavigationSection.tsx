import { useState } from "react";
import { Flag, Info } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { Dialog, DialogClose } from "../../ui/Dialog";
import { GymCard } from "../../ui/GymCard";
import { NavBar, PRIMARY_NAV } from "../../ui/NavBar";
import { Popover } from "../../ui/Popover";
import { Sheet, SHEET_STOPS } from "../../ui/Sheet";
import type { SheetStop } from "../../ui/Sheet";
import { Section, sg, Specimen } from "./parts";
import { kmFromCentre, SAMPLE_GYMS } from "./samples";

// Point Gyms at this page so the current-page state shows.
const DEMO_NAV = PRIMARY_NAV.map((item) => (item.label === "Gyms" ? { ...item, to: "/styleguide" } : item));

export function NavigationSection() {
  const [stop, setStop] = useState<SheetStop>("half");
  const [salute, lystra, , , gymHouse] = SAMPLE_GYMS;
  return (
    <Section id="sg-navigation" title="Navigation and layers">
      <Specimen title="Nav bar" caption="Four items. The current page (Gyms here) gets a plate bar and a heavier label.">
        <NavBar placement="bottom" items={DEMO_NAV} />
        <NavBar placement="top" items={DEMO_NAV} />
      </Specimen>
      <Specimen title="Dialog and popover" caption="Radix primitives. Dialog traps focus and returns it; popover is for short explanations.">
        <div className={sg.row}>
          <Dialog
            title="Something wrong with Salute Gym?"
            description="Tell us what to fix. Your message goes to the Find My Gym WhatsApp."
            trigger={<Button variant="secondary" icon={Flag}>Report a problem</Button>}
            footer={<DialogClose asChild><Button variant="primary">Done</Button></DialogClose>}
          >
            <p>Wrong phone, closed down, or not a gym. Pick one on the next screen.</p>
          </Dialog>
          <Popover
            label="Why Corroborated"
            trigger={<Button variant="quiet" icon={Info}>Why Corroborated?</Button>}
          >
            <p>Two independent map sources list this gym at the same spot. Nobody has visited or called it for us yet.</p>
          </Popover>
        </div>
      </Specimen>
      <Specimen title="Sheet" caption="Mobile bottom sheet over the map. Drag or tap the handle, or focus it and use the arrow keys.">
        <div className={sg.row}>
          {SHEET_STOPS.map((item) => (
            <Chip key={item} label={item[0].toUpperCase() + item.slice(1)} selected={stop === item} onToggle={() => setStop(item)} />
          ))}
        </div>
        <div className={sg.phone}>
          <p className={sg.mapNote}>Map area</p>
          <Sheet title="Gyms near Umoja" stop={stop} onStopChange={setStop}>
            <div className={sg.stack}>
              {[salute, gymHouse, lystra].map((gym) => (
                <GymCard
                  key={gym.slug}
                  name={gym.name}
                  href={`/gym/${gym.slug}`}
                  place={gym.place}
                  tier={gym.tier}
                  km={kmFromCentre(gym)}
                  renderLink={({ href, className, children }) => <Link to={href} className={className}>{children}</Link>}
                />
              ))}
            </div>
          </Sheet>
        </div>
      </Specimen>
    </Section>
  );
}
