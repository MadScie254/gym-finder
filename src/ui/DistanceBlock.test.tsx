// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { DistanceBlock } from "./DistanceBlock";
import { mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

it("sets the number apart from the unit and says it is straight-line", async () => {
  ui = await mount(<DistanceBlock km={1.234} />);
  const block = ui.container.firstElementChild!;
  expect(block.querySelector("[aria-hidden='true']")?.textContent).toBe("1.2km");
  expect(block.querySelector(".sr-only")?.textContent).toBe("1.2 kilometres away in a straight line");
  expect(block.hasAttribute("data-open")).toBe(false);
});

it("turns to the open state only when told the gym is open", async () => {
  ui = await mount(<DistanceBlock km={0.46} open />);
  const block = ui.container.firstElementChild!;
  expect(block.hasAttribute("data-open")).toBe(true);
  expect(block.textContent).toContain("Open now");
  expect(block.textContent).toContain("460");
});

it("says plainly when there is no location", async () => {
  ui = await mount(<DistanceBlock km={null} />);
  expect(ui.container.textContent).toContain("No location");
  expect(ui.container.textContent).toContain("Distance unknown");
});
