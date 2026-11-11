// Shared by the src/ui component tests. Same idiom as the feature tests:
// a real React root inside jsdom, driven with act().
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";

export type Mounted = {
  container: HTMLDivElement;
  rerender: (node: ReactNode) => Promise<void>;
  unmount: () => Promise<void>;
};

export async function mount(node: ReactNode, { route = "/" }: { route?: string } = {}): Promise<Mounted> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);
  const wrap = (child: ReactNode) => <MemoryRouter initialEntries={[route]}>{child}</MemoryRouter>;
  await act(async () => root.render(wrap(node)));
  return {
    container,
    rerender: async (next) => { await act(async () => root.render(wrap(next))); },
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export async function press(target: Element, key: string) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

export async function click(target: Element) {
  await act(async () => {
    (target as HTMLElement).click();
  });
}

export async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
