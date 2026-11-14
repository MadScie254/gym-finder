// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { NavBar } from "./NavBar";
import { mount, type Mounted } from "./test-utils";

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
