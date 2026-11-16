// @vitest-environment jsdom
import { Menu } from "lucide-react";
import { afterEach, expect, it, vi } from "vitest";
import { NavBar } from "./NavBar";
import { click, mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

it("has four primary items and marks the current page", async () => {
  ui = await mount(<NavBar />, { route: "/plan" });
  const nav = ui.container.querySelector("nav")!;
  expect(nav.getAttribute("aria-label")).toBe("Primary");
  const links = [...nav.querySelectorAll("a")];
  expect(links.map((link) => link.textContent)).toEqual(["Home", "Find gyms", "Saved", "My week"]);
  expect(links.find((link) => link.getAttribute("aria-current") === "page")?.textContent).toBe("My week");
});

it("does not mark Home as current on other pages", async () => {
  ui = await mount(<NavBar />, { route: "/saved" });
  const home = ui.container.querySelector("a[href='/']")!;
  expect(home.getAttribute("aria-current")).toBeNull();
});

it("marks Find gyms current on a gym profile", async () => {
  ui = await mount(<NavBar />, { route: "/gym/salute-gym-179a" });
  expect(ui.container.querySelector("a[aria-current='page']")?.textContent).toBe("Find gyms");
});

it("adds a More button after the links that opens a dialog, and counts it as a tab", async () => {
  const onSelect = vi.fn();
  ui = await mount(<NavBar extra={{ label: "More", icon: Menu, onSelect }} />, { route: "/" });
  const nav = ui.container.querySelector("nav")!;
  expect(nav.querySelectorAll("a")).toHaveLength(4);
  const more = nav.querySelector("button")!;
  expect(more.textContent).toBe("More");
  expect(more.getAttribute("aria-haspopup")).toBe("dialog");
  expect(more.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(nav.querySelector("ul")!.getAttribute("style")).toContain("--tabs: 5");
  await click(more);
  expect(onSelect).toHaveBeenCalledOnce();
});

it("shows More as the current tab only when asked to, without claiming a page", async () => {
  ui = await mount(<NavBar extra={{ label: "More", icon: Menu, onSelect: () => undefined, current: true }} />, { route: "/reports" });
  const more = ui.container.querySelector("button")!;
  expect(more.getAttribute("data-current")).toBe("true");
  expect(more.hasAttribute("aria-current")).toBe(false);
});

it("has four columns without a More button", async () => {
  ui = await mount(<NavBar />, { route: "/" });
  expect(ui.container.querySelector("ul")!.getAttribute("style")).toContain("--tabs: 4");
});
