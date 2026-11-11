// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { Sheet } from "./Sheet";
import type { SheetStop } from "./Sheet";
import { click, mount, press, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

function Harness({ start = "peek" as SheetStop }) {
  const [stop, setStop] = useState<SheetStop>(start);
  return <div style={{ position: "relative", height: "600px" }}><Sheet title="Gyms near Umoja" stop={stop} onStopChange={setStop}><p>List</p></Sheet></div>;
}

const sheet = (m: Mounted) => m.container.querySelector("section")!;
const handle = (m: Mounted) => m.container.querySelector("button")!;

it("is a labelled region, not a modal", async () => {
  ui = await mount(<Harness />);
  const region = sheet(ui);
  expect(region.getAttribute("role")).toBeNull();
  expect(region.getAttribute("aria-modal")).toBeNull();
  expect(document.getElementById(region.getAttribute("aria-labelledby")!)?.textContent).toBe("Gyms near Umoja");
});

it("moves between stops with the arrow keys, Home and End", async () => {
  ui = await mount(<Harness />);
  await press(handle(ui), "ArrowUp");
  expect(sheet(ui).dataset.stop).toBe("half");
  await press(handle(ui), "ArrowUp");
  expect(sheet(ui).dataset.stop).toBe("full");
  await press(handle(ui), "ArrowUp");
  expect(sheet(ui).dataset.stop).toBe("full");
  await press(handle(ui), "Home");
  expect(sheet(ui).dataset.stop).toBe("peek");
  await press(handle(ui), "End");
  expect(handle(ui).getAttribute("aria-label")).toContain("fully open");
});

it("cycles stops when the handle is pressed", async () => {
  ui = await mount(<Harness start="full" />);
  await click(handle(ui));
  expect(sheet(ui).dataset.stop).toBe("peek");
});
