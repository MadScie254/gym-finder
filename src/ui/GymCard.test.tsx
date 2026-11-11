// @vitest-environment jsdom
import { Phone } from "lucide-react";
import { afterEach, expect, it } from "vitest";
import { ActionRow } from "./ActionRow";
import { GymCard } from "./GymCard";
import { mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

it("names the card by the gym, links the name, and keeps actions outside the link", async () => {
  ui = await mount(
    <GymCard
      name="Salute Gym"
      href="/gym/salute-gym-179a"
      place="Umoja 2, Nairobi"
      kind="Gym"
      tier="corroborated"
      km={9.3}
      selected
      actions={<ActionRow label="Contact Salute Gym" actions={[{ id: "call", label: "Call", icon: Phone, href: "tel:+254769700300" }]} />}
    />,
  );
  const card = ui.container.querySelector("article")!;
  const heading = card.querySelector("h3")!;
  expect(card.getAttribute("aria-labelledby")).toBe(heading.id);
  expect(heading.querySelector("a")?.getAttribute("href")).toBe("/gym/salute-gym-179a");
  expect(card.textContent).toContain("Umoja 2, Nairobi, Gym");
  expect(card.hasAttribute("data-selected")).toBe(true);
  expect(heading.querySelector("a")!.contains(card.querySelector("a[href^='tel:']"))).toBe(false);
});

it("says when the area is not listed instead of inventing one", async () => {
  ui = await mount(<GymCard name="Hot Sports Gym" href="/gym/hot-sports-gym-1b7b" place={null} tier="listed" km={null} />);
  expect(ui.container.textContent).toContain("Area not listed");
});
