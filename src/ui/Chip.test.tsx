// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { Chip } from "./Chip";
import { click, mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

function Harness() {
  const [on, setOn] = useState(false);
  return <Chip label="Open now" count={12} selected={on} onToggle={() => setOn(!on)} />;
}

it("toggles aria-pressed and adds a tick when selected", async () => {
  ui = await mount(<Harness />);
  const chip = ui.container.querySelector("button")!;
  expect(chip.getAttribute("aria-pressed")).toBe("false");
  expect(chip.querySelector("svg")).toBeNull();
  await click(chip);
  expect(chip.getAttribute("aria-pressed")).toBe("true");
  expect(chip.querySelector("svg")).not.toBeNull();
});

it("speaks the count with its noun", async () => {
  ui = await mount(<Chip label="Has phone" count={441} selected={false} onToggle={() => {}} />);
  expect(ui.container.textContent).toBe("Has phone, 441 gyms");
});
