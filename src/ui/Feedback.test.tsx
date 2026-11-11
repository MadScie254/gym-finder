// @vitest-environment jsdom
import { SearchX } from "lucide-react";
import { afterEach, expect, it, vi } from "vitest";
import { Banner } from "./Banner";
import { DemoTag } from "./DemoTag";
import { EmptyState } from "./EmptyState";
import { SkeletonList } from "./Skeleton";
import { click, mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

it("banner is a polite status with an optional action", async () => {
  const onReload = vi.fn();
  ui = await mount(<Banner kind="update" action={{ label: "Reload", onClick: onReload }}>A newer gym list is ready.</Banner>);
  const banner = ui.container.querySelector("[role='status']")!;
  expect(banner.getAttribute("data-kind")).toBe("update");
  await click(banner.querySelector("button")!);
  expect(onReload).toHaveBeenCalledOnce();
});

it("demo banner carries the visible Demo marker", async () => {
  ui = await mount(<Banner kind="demo">Demo stores and sample menus. Ordering is not live yet.</Banner>);
  expect(ui.container.textContent).toMatch(/^Demo, sample data/);
});

it("demo tag shows the word Demo and explains it to screen readers", async () => {
  ui = await mount(<DemoTag />);
  expect(ui.container.textContent).toBe("Demo, sample data, not a live service");
});

it("skeleton list announces loading once and hides its shapes", async () => {
  ui = await mount(<SkeletonList count={2} />);
  const status = ui.container.querySelector("[role='status']")!;
  expect(status.textContent).toBe("Loading gyms");
  expect(status.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(2);
});

it("empty state uses the heading level it is given", async () => {
  ui = await mount(<EmptyState level={3} icon={SearchX} title="No gyms match"><p>Widen the distance.</p></EmptyState>);
  expect(ui.container.querySelector("h3")?.textContent).toBe("No gyms match");
});
