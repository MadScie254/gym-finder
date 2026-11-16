// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { t } from "../lib/i18n";
import { Shell } from "./Shell";
import { StoreProvider } from "./stores";

const venueState = vi.hoisted(() => ({ offline: false }));

vi.mock("./venue-context", () => ({
  useVenueContext: () => ({ lang: "en", offline: venueState.offline, index: { manifest: { builtAt: "2026-11-11T14:19:21.136Z" } }, setLang: vi.fn() }),
  useT: () => (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t("en", key, vars),
}));
vi.mock("../features/report/report-store", () => ({ useReport: () => ({ open: vi.fn() }) }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  venueState.offline = false;
});

async function render(path: string) {
  await act(async () => root.render(
    <StoreProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route element={<Shell />}><Route path="*" element={<p>Page body</p>} /></Route></Routes>
      </MemoryRouter>
    </StoreProvider>,
  ));
}

it("has the four primary sections and marks Find gyms on discovery pages", async () => {
  await render("/in/kisumu");
  const links = [...container.querySelectorAll("nav[aria-label='Primary'] a")];
  expect(links.map((link) => link.textContent)).toEqual(["Home", "Find gyms", "Saved", "My week"]);
  expect(container.querySelector("a[aria-current='page']")?.textContent).toBe("Find gyms");
  expect(container.textContent).not.toContain("Fuel");
  expect(container.textContent).toContain("Page body");
});

it("says when it is offline and from which date the list is", async () => {
  venueState.offline = true;
  await render("/");
  expect(container.textContent).toContain("Offline. Showing the gym list from 11 Nov 2026.");
});
