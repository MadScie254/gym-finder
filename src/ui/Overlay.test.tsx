// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Popover } from "./Popover";
import { click, mount, press, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

it("dialog opens from its trigger, is labelled, and closes on Escape", async () => {
  ui = await mount(
    <Dialog title="Something wrong with Salute Gym?" description="Tell us what to fix." trigger={<Button>Report a problem</Button>}>
      <p>Body</p>
    </Dialog>,
  );
  await click(ui.container.querySelector("button")!);
  const dialog = document.querySelector("[role='dialog']")!;
  expect(dialog).not.toBeNull();
  expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("Something wrong with Salute Gym?");
  expect(dialog.querySelector("button[aria-label='Close']")).not.toBeNull();
  await press(dialog, "Escape");
  expect(document.querySelector("[role='dialog']")).toBeNull();
});

it("popover opens from its trigger with an accessible name", async () => {
  ui = await mount(<Popover label="Why Corroborated" trigger={<Button>Why Corroborated?</Button>}><p>Two sources.</p></Popover>);
  const trigger = ui.container.querySelector("button")!;
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  await click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(document.querySelector("[aria-label='Why Corroborated']")?.textContent).toBe("Two sources.");
});
