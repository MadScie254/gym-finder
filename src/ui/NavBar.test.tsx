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
  expect(links.map((link) => link.textContent)).toEqual(["Gyms", "Fuel", "Plan", "Saved"]);
  expect(links.find((link) => link.getAttribute("aria-current") === "page")?.textContent).toBe("Plan");
});

it("does not mark Gyms as current on other pages", async () => {
  ui = await mount(<NavBar />, { route: "/saved" });
  const gyms = ui.container.querySelector("a[href='/']")!;
  expect(gyms.getAttribute("aria-current")).toBeNull();
});
