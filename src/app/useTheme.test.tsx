// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { nextTheme } from "../lib/storage";
import { click, mount, type Mounted } from "../ui/test-utils";
import { useTheme } from "./useTheme";

let ui: Mounted | undefined;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(async () => {
  await ui?.unmount();
  ui = undefined;
});

function Reader({ id }: { id: string }) {
  const [theme] = useTheme();
  return <p data-testid={id}>{theme}</p>;
}

function Cycler() {
  const [theme, setTheme] = useTheme();
  return <button type="button" onClick={() => setTheme(nextTheme(theme))}>Cycle</button>;
}

const read = (id: string) => ui!.container.querySelector(`[data-testid='${id}']`)?.textContent;

it("shows one appearance choice to every component, and keeps the page and storage in step with it", async () => {
  ui = await mount(<><Reader id="top bar" /><Reader id="palette" /><Reader id="menu" /><Cycler /></>);
  const cycle = ui.container.querySelector("button")!;
  expect(["top bar", "palette", "menu"].map(read)).toEqual(["system", "system", "system"]);

  await click(cycle);
  expect(["top bar", "palette", "menu"].map(read)).toEqual(["light", "light", "light"]);
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("fmg-theme")).toContain("light");

  await click(cycle);
  expect(read("palette")).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");

  await click(cycle);
  expect(["top bar", "palette", "menu"].map(read)).toEqual(["system", "system", "system"]);
  expect(document.documentElement.dataset.theme).toBeUndefined();
});

it("starts from the choice already on the page", async () => {
  document.documentElement.dataset.theme = "dark";
  ui = await mount(<Reader id="top bar" />);
  expect(read("top bar")).toBe("dark");
});
