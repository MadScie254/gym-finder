// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { SearchField } from "./SearchField";
import type { SearchGroup, SearchOption } from "./SearchField";
import { mount, press, type, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

const GROUPS: SearchGroup[] = [
  { id: "gyms", label: "Gyms", options: [{ id: "salute", label: "Salute Gym", hint: "Umoja 2, Nairobi" }] },
  { id: "areas", label: "Areas", options: [{ id: "umoja", label: "Umoja", hint: "Estate, Nairobi" }] },
];

function Harness({ onSelect }: { onSelect: (option: SearchOption) => void }) {
  const [value, setValue] = useState("");
  const groups = value.length >= 2 && value !== "zzz" ? GROUPS : GROUPS.map((group) => ({ ...group, options: [] }));
  return <SearchField label="Search gyms and areas" value={value} onValueChange={setValue} groups={groups} onSelect={onSelect} />;
}

it("follows the ARIA 1.2 combobox pattern with grouped options", async () => {
  ui = await mount(<Harness onSelect={() => {}} />);
  const input = ui.container.querySelector("input")!;
  expect(input.getAttribute("role")).toBe("combobox");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  await type(input, "um");
  expect(input.getAttribute("aria-expanded")).toBe("true");
  const listbox = document.getElementById(input.getAttribute("aria-controls")!)!;
  expect(listbox.getAttribute("role")).toBe("listbox");
  const groups = [...listbox.querySelectorAll("[role='group']")];
  expect(groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent)).toEqual(["Gyms", "Areas"]);
  expect(document.getElementById(input.getAttribute("aria-activedescendant")!)?.textContent).toContain("Salute Gym");
});

it("moves the active option with the arrow keys and selects with Enter", async () => {
  const onSelect = vi.fn();
  ui = await mount(<Harness onSelect={onSelect} />);
  const input = ui.container.querySelector("input")!;
  await type(input, "um");
  await press(input, "ArrowDown");
  const active = document.getElementById(input.getAttribute("aria-activedescendant")!)!;
  expect(active.textContent).toContain("Umoja");
  expect(active.getAttribute("aria-selected")).toBe("true");
  await press(input, "Enter");
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "umoja" }), expect.objectContaining({ id: "areas" }));
  expect(input.getAttribute("aria-expanded")).toBe("false");
});

it("Escape closes the list first, then clears the text", async () => {
  ui = await mount(<Harness onSelect={() => {}} />);
  const input = ui.container.querySelector("input")!;
  await type(input, "um");
  await press(input, "Escape");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(input.value).toBe("um");
  await press(input, "Escape");
  expect(input.value).toBe("");
});

it("announces when nothing matches", async () => {
  ui = await mount(<Harness onSelect={() => {}} />);
  const input = ui.container.querySelector("input")!;
  await type(input, "zzz");
  expect(ui.container.querySelector("[role='status']")?.textContent).toBe("No gyms or places match that.");
});
