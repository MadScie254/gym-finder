// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router";
import { click, mount, type Mounted } from "../../ui/test-utils";
import PlanRoutes from "./index";
import { loadDone } from "./planStore";
import { DEFAULT_PLAN_SETTINGS } from "../../lib/planner";

const SAFETY = [
  "A conservative starting point. It does not diagnose conditions, count calories, or replace a trainer or clinician.",
  "Stop if you feel pain, dizziness or unusual breathlessness. If pregnant, injured or managing a medical condition, ask a qualified professional to adapt this plan.",
  "On other days, take an easy walk if you can. Aim to build toward 150 minutes of moderate movement a week, at your own pace.",
];
const MEAL_SAFETY = [
  "Add water regularly. These are meal ideas, not calorie or medical prescriptions.",
  "Check ingredients for your allergies and food restrictions. Portions vary with age, activity and health; a registered dietitian can personalize them.",
];

let view: Mounted | null = null;
beforeEach(() => window.localStorage.clear());
afterEach(async () => { await view?.unmount(); view = null; });

const render = (path: string) => mount(<Routes><Route path="/plan/*" element={<PlanRoutes />} /></Routes>, { route: path });
const text = () => view?.container.textContent ?? "";
const button = (name: string | RegExp) => [...(view?.container.querySelectorAll("button") ?? [])]
  .find((b) => (typeof name === "string" ? b.textContent === name : name.test(b.textContent ?? "")));

describe("My week, today", () => {
  it("works with no setup and keeps the safety sentences", async () => {
    view = await render("/plan");
    expect(text()).toContain("This is a starter routine");
    expect(view.container.querySelector("h2")?.textContent).toBeTruthy();
    for (const sentence of SAFETY) expect(text()).toContain(sentence);
    expect(text()).not.toMatch(/streak of|you lost|you missed/i);
  });

  it("marks a session done and stores it on this device", async () => {
    view = await render("/plan");
    const title = view.container.querySelector("section h2")?.textContent;
    await click(button("Mark session done")!);
    expect(loadDone(DEFAULT_PLAN_SETTINGS)).toHaveLength(1);
    expect(view.container.querySelector("section h2")?.textContent).not.toBe(title);
  });

  it("pauses without losing anything and resumes", async () => {
    view = await render("/plan");
    await click(button("Pause my plan")!);
    expect(text()).toContain("Nothing is lost.");
    await click(button("Resume my plan")!);
    expect(button("Mark session done")).toBeDefined();
  });
});

describe("My week, setup", () => {
  it("previews and explains progress before saving", async () => {
    view = await render("/plan/setup");
    expect(text()).toContain("Nothing changes until you save.");
    expect(text()).toContain("Your ticks stay as they are.");
    const five = [...view.container.querySelectorAll("label")].find((l) => l.textContent === "5 days a week")!;
    await click(five.querySelector("input")!);
    expect(text()).toContain("its ticks start empty");
    expect(window.localStorage.getItem("fmg-plan-settings-v1")).toBeNull();
    expect(view.container.querySelectorAll("ul li").length).toBeGreaterThanOrEqual(5);
  });
});

describe("My week, meals", () => {
  it("shows seven days, swaps, safety lines and the demo food section", async () => {
    view = await render("/plan/meals");
    expect(view.container.querySelectorAll("h3")).toHaveLength(7);
    expect(text()).toContain("Swaps:");
    for (const sentence of MEAL_SAFETY) expect(text()).toContain(sentence);
    expect(text()).toContain("Order food (demo)");
    expect(text()).toContain("Demo stores and sample menus. Ordering is not live yet.");
    expect(view.container.querySelector("a[href='/fuel']")).not.toBeNull();
  });

  it("drops meat and fish when the meals are vegetarian", async () => {
    view = await render("/plan/meals");
    const veg = [...view.container.querySelectorAll("label")].find((l) => l.textContent?.startsWith("Vegetarian"))!;
    await click(veg.querySelector("input")!);
    const days = [...view.container.querySelectorAll("ol li")].map((li) => li.textContent).join(" ");
    expect(days).not.toMatch(/chicken|tilapia|fish/i);
  });
});

describe("My week, shopping", () => {
  it("makes the list in one tap, grouped by aisle, and ticks items", async () => {
    view = await render("/plan/shopping");
    await click(button("Make shopping list")!);
    const aisles = [...view.container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(aisles).toEqual(expect.arrayContaining(["Produce", "Grains and legumes", "Protein", "Dairy", "Pantry"]));
    expect(text()).toContain("Quantities are estimates.");
    const box = view.container.querySelector<HTMLInputElement>("input[type=checkbox]")!;
    await act(async () => { box.click(); });
    expect(text()).toMatch(/1of \d+ items ticked/);
    const wa = [...view.container.querySelectorAll<HTMLAnchorElement>("a")].find((a) => a.textContent?.startsWith("Send list on WhatsApp"))!;
    expect(wa.href.startsWith("https://wa.me/?text=")).toBe(true);
  });
});
