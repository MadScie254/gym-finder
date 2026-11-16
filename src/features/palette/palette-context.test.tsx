// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { mount, type Mounted } from "../../ui/test-utils";
import { PaletteProvider, usePalette } from "./palette-context";

// The palette chunk cannot be fetched, as after a deploy removed the script this page still points at.
vi.mock("./CommandPalette", () => { throw new Error("Failed to fetch dynamically imported module"); });

let ui: Mounted | undefined;
afterEach(async () => {
  await ui?.unmount();
  ui = undefined;
  vi.restoreAllMocks();
});

function Page() {
  const { open } = usePalette();
  return <p data-testid="state">{open ? "open" : "closed"}</p>;
}

it("closes quietly when the palette cannot load, and leaves the rest of the app standing", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined); // React logs a caught render error
  ui = await mount(<PaletteProvider><Page /><p>The app</p></PaletteProvider>);
  const state = () => ui!.container.querySelector("[data-testid='state']")?.textContent;
  expect(state()).toBe("closed");

  await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })); });
  for (let i = 0; i < 50 && state() !== "closed"; i += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  // Open flipped on, the load failed, and it flipped off again. The page is still there.
  expect(state()).toBe("closed");
  expect(ui.container.textContent).toContain("The app");
});
