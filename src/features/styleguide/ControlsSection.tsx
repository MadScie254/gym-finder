import { useMemo, useState } from "react";
import { Bookmark, Info, Navigation, Phone, Share2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useVenueContext } from "../../app/venue-context";
import { countWith } from "../../lib/results";
import { NO_FILTERS, type Filters } from "../../lib/urlState";
import { NAIROBI } from "../../lib/kenya";
import { Accordion, AccordionItem } from "../../ui/Accordion";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { IconButton } from "../../ui/IconButton";
import { SearchField } from "../../ui/SearchField";
import type { SearchGroup } from "../../ui/SearchField";
import { Section, sg, Specimen } from "./parts";
import { SAMPLE_GYMS, SAMPLE_PLACES } from "./samples";

export function ControlsSection() {
  const [saved, setSaved] = useState(true);
  const [chips, setChips] = useState<Record<string, boolean>>({ gym: true, open: false, near: false, phone: false, women: false });
  const [query, setQuery] = useState("umoja");
  const [picked, setPicked] = useState<string | null>(null);
  const toggle = (key: string) => setChips((prev) => ({ ...prev, [key]: !prev[key] }));
  const { index } = useVenueContext();
  // Live counts from the loaded catalogue, with the app's default filters.
  const counts = useMemo(() => {
    const venues = (index?.venues ?? []).filter((venue) => venue.trust.tier !== "unconfirmed");
    const count = (patch: Partial<Filters>, from: typeof NAIROBI | null = null) => (index ? countWith(venues, NO_FILTERS, patch, from) : undefined);
    return {
      gym: count({ kind: "gym" }),
      open: count({ open: true }),
      near: count({ km: 5 }, NAIROBI),
      phone: count({ phone: true }),
      women: index ? venues.filter((venue) => venue.amenities.women_only).length : undefined,
    };
  }, [index]);

  const groups = useMemo<SearchGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const gyms = SAMPLE_GYMS.filter((gym) => `${gym.name} ${gym.place}`.toLowerCase().includes(q))
      .map((gym) => ({ id: gym.slug, label: gym.name, hint: gym.place }));
    const places = SAMPLE_PLACES.filter((place) => place.label.toLowerCase().includes(q));
    return [{ id: "gyms", label: "Gyms", options: gyms }, { id: "places", label: "Areas", options: places }];
  }, [query]);

  return (
    <Section id="sg-controls" title="Controls">
      <Specimen title="Button" caption="Primary for the one action that matters. Secondary for the rest. Quiet for low-stakes links.">
        <div className={sg.row}>
          <Button variant="primary" icon={Phone}>Call</Button>
          <Button variant="secondary" icon={Navigation}>Directions</Button>
          <Button variant="quiet">Suggest a correction</Button>
        </div>
        <div className={sg.row}>
          <Button variant="secondary" icon={Bookmark} aria-pressed={saved} onClick={() => setSaved(!saved)}>{saved ? "Saved" : "Save"}</Button>
          <Button variant="primary" disabled>Call</Button>
          <Button variant="secondary" href="#sg-controls">Link styled as a button</Button>
        </div>
        <p className={sg.caption}>Pressed (Saved), disabled, and a link. Tab through to see focus.</p>
      </Specimen>
      <Specimen title="Accordion" caption="Folds what people need less often. The first item is open by default; each opens on its own. Native details, so it works without JavaScript.">
        <Accordion>
          <AccordionItem title="What the badges mean" icon={Info} defaultOpen>Verified means we checked the gym's own website on a date we show. Corroborated means two sources list it. Listed means one source does.</AccordionItem>
          <AccordionItem title="How we check gym details" icon={ShieldCheck}>We open each gym's own website and write down only what it says.</AccordionItem>
        </Accordion>
      </Specimen>
      <Specimen title="Icon button" caption="Always has a name for screen readers; the name also shows on hover.">
        <div className={sg.row}>
          <IconButton icon={SlidersHorizontal} label="Filters" />
          <IconButton icon={Share2} label="Share" variant="quiet" />
          <IconButton icon={Bookmark} label="Save Salute Gym" pressed={saved} onClick={() => setSaved(!saved)} />
          <IconButton icon={Phone} label="Call" disabled />
        </div>
      </Specimen>
      <Specimen title="Chip" caption="Toggle filters with a count. Selected adds a tick and signal fill. Counts come live from the loaded catalogue with the default filters, distance from central Nairobi. A filter with no results is disabled (dashed).">
        <div className={sg.scroller}>
          <Chip label="Gym" count={counts.gym} selected={chips.gym} onToggle={() => toggle("gym")} />
          <Chip label="Open now" count={counts.open} selected={chips.open} onToggle={() => toggle("open")} disabled={counts.open === 0} />
          <Chip label="Under 5 km" count={counts.near} selected={chips.near} onToggle={() => toggle("near")} />
          <Chip label="Has phone" count={counts.phone} selected={chips.phone} onToggle={() => toggle("phone")} />
          <Chip label="Women only" count={counts.women} selected={chips.women} onToggle={() => toggle("women")} disabled={counts.women === 0} />
        </div>
      </Specimen>
      <Specimen title="Search field" caption="Combobox with grouped options. Arrow keys move, Enter opens, Escape closes then clears.">
        <div style={{ minHeight: "300px" }}>
          <SearchField
            defaultOpen
            label="Search gyms and areas"
            placeholder="Gym name or area"
            value={query}
            onValueChange={setQuery}
            groups={groups}
            onSelect={(option) => setPicked(option.label)}
            onLocate={() => setPicked("your location")}
            emptyText="No gyms or areas match that. Check the spelling or try a nearby area."
          />
        </div>
        <p className={sg.caption} aria-live="polite">{picked ? `Picked ${picked}.` : "Try typing \"lys\" or \"zzz\"."}</p>
      </Specimen>
    </Section>
  );
}
