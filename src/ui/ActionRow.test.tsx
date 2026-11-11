// @vitest-environment jsdom
import { Bookmark, Navigation, Phone } from "lucide-react";
import { afterEach, expect, it, vi } from "vitest";
import { ActionRow } from "./ActionRow";
import { click, mount, type Mounted } from "./test-utils";

let ui: Mounted | undefined;
afterEach(async () => { await ui?.unmount(); });

it("renders a named list with the first action as the primary one", async () => {
  const onSave = vi.fn();
  ui = await mount(
    <ActionRow
      label="Contact Salute Gym"
      actions={[
        { id: "call", label: "Call", icon: Phone, href: "tel:+254769700300" },
        { id: "dir", label: "Directions", icon: Navigation, href: "https://www.google.com/maps/dir/?api=1", external: true },
        { id: "save", label: "Save", icon: Bookmark, onClick: onSave, pressed: false },
      ]}
    />,
  );
  const list = ui.container.querySelector("ul")!;
  expect(list.getAttribute("aria-label")).toBe("Contact Salute Gym");
  expect(list.dataset.count).toBe("3");
  const [call, directions] = [...list.querySelectorAll("a")];
  expect(call.getAttribute("href")).toBe("tel:+254769700300");
  expect(directions.getAttribute("target")).toBe("_blank");
  expect(directions.getAttribute("rel")).toBe("noopener noreferrer");
  const save = list.querySelector("button")!;
  expect(save.getAttribute("aria-pressed")).toBe("false");
  await click(save);
  expect(onSave).toHaveBeenCalledOnce();
});

it("renders nothing when there are no actions", async () => {
  ui = await mount(<ActionRow label="None" actions={[]} />);
  expect(ui.container.innerHTML).toBe("");
});
