// @vitest-environment jsdom
import { Phone } from "lucide-react";
import { afterEach, expect, it, vi } from "vitest";
import { Button, buttonClassName } from "./Button";
import { IconButton } from "./IconButton";
import { click, mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

it("renders a real button that defaults to type=button and calls onClick", async () => {
  const onClick = vi.fn();
  ui = await mount(<Button variant="primary" icon={Phone} onClick={onClick}>Call</Button>);
  const button = ui.container.querySelector("button")!;
  expect(button.getAttribute("type")).toBe("button");
  expect(button.textContent).toBe("Call");
  expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  await click(button);
  expect(onClick).toHaveBeenCalledOnce();
});

it("renders a link when given href and keeps link attributes", async () => {
  ui = await mount(<Button href="tel:+254769700300" rel="noopener">Call</Button>);
  const link = ui.container.querySelector("a")!;
  expect(link.getAttribute("href")).toBe("tel:+254769700300");
  expect(link.getAttribute("rel")).toBe("noopener");
  expect(ui.container.querySelector("button")).toBeNull();
});

it("exposes pressed state for toggles and blocks clicks when disabled", async () => {
  const onClick = vi.fn();
  ui = await mount(<><Button aria-pressed>Saved</Button><Button disabled onClick={onClick}>Call</Button></>);
  const [saved, call] = [...ui.container.querySelectorAll("button")];
  expect(saved.getAttribute("aria-pressed")).toBe("true");
  await click(call);
  expect(onClick).not.toHaveBeenCalled();
});

it("shares its classes so a router link can look like a button", () => {
  expect(buttonClassName("primary", true).split(" ").length).toBe(3);
});

it("icon button always carries an accessible name", async () => {
  ui = await mount(<IconButton icon={Phone} label="Call Salute Gym" pressed={false} />);
  const button = ui.container.querySelector("button")!;
  expect(button.getAttribute("aria-label")).toBe("Call Salute Gym");
  expect(button.getAttribute("aria-pressed")).toBe("false");
  expect(button.textContent).toBe("");
});
