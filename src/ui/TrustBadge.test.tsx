// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import type { TrustTier } from "../data/types";
import { TrustBadge } from "./TrustBadge";
import { mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

const TIERS: TrustTier[] = ["verified", "corroborated", "listed", "unconfirmed"];

it("gives every tier its own word and its own shape", async () => {
  ui = await mount(<>{TIERS.map((tier) => <TrustBadge key={tier} tier={tier} />)}</>);
  const badges = [...ui.container.querySelectorAll("[data-tier]")];
  expect(badges.map((badge) => badge.textContent)).toEqual(["Verified", "Corroborated", "Listed", "Unconfirmed"]);
  const shapes = badges.map((badge) => badge.querySelector("svg")!.innerHTML);
  expect(new Set(shapes).size).toBe(4);
  expect(badges.every((badge) => badge.querySelector("svg")!.getAttribute("aria-hidden") === "true")).toBe(true);
});
