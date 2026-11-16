// @vitest-environment jsdom
import { Search } from "lucide-react";
import { afterEach, expect, it } from "vitest";
import { Accordion, AccordionItem } from "./Accordion";
import { click, mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

const group = (
  <Accordion>
    <AccordionItem title="What the badges mean" icon={Search} defaultOpen>Verified means checked on the gym's own site.</AccordionItem>
    <AccordionItem title="How we check details">We open each gym's website.</AccordionItem>
  </Accordion>
);

const items = (container: HTMLElement) => [...container.querySelectorAll("details")];

it("is closed by default and open with defaultOpen", async () => {
  ui = await mount(group);
  const [first, second] = items(ui.container);
  expect(first.open).toBe(true);
  expect(second.open).toBe(false);
});

it("opens when its summary is clicked and leaves the other item alone", async () => {
  ui = await mount(group);
  const [first, second] = items(ui.container);
  await click(second.querySelector("summary")!);
  expect(second.open).toBe(true);
  expect(first.open).toBe(true);
  await click(second.querySelector("summary")!);
  expect(second.open).toBe(false);
});

it("names each summary by its title and hides the icon and the chevron from assistive tech", async () => {
  ui = await mount(group);
  const [first, second] = items(ui.container);
  expect(first.querySelector("summary")!.textContent).toBe("What the badges mean");
  expect(second.querySelector("summary")!.textContent).toBe("How we check details");
  for (const svg of ui.container.querySelectorAll("summary svg")) expect(svg.getAttribute("aria-hidden")).toBe("true");
  expect(first.querySelectorAll("summary svg").length).toBe(2);
  expect(second.querySelectorAll("summary svg").length).toBe(1);
});
