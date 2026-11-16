import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useLocation, useNavigationType } from "react-router";
import { prefersReducedMotion } from "./useMediaQuery";

/** Give up waiting for a page to grow tall enough to scroll back to where it was left, after this many frames. */
const RESTORE_FRAMES = 20;

/** How far a key moves the page: a distance in pixels (negative is up), or the very top or bottom. */
function travel(node: HTMLElement, key: string, shift: boolean): number | "top" | "bottom" | null {
  const page = node.clientHeight * 0.875;
  switch (key) {
    case "PageDown": return page;
    case "PageUp": return -page;
    case " ": return shift ? -page : page;
    case "ArrowDown": return 40;
    case "ArrowUp": return -40;
    case "Home": return "top";
    case "End": return "bottom";
    default: return null;
  }
}

/**
 * Scrolling for the layout where the page scrolls inside <main> and the document does not (sidebar mode). A
 * browser only does these things for the document, so they are done here. `active` is false in the other
 * layouts, which scroll the document and need none of this.
 *
 * - A new page starts at its top. Back and Forward return to where that history entry was left.
 * - Scroll keys work. A browser sends them to the focused element's scroll area, and the sidebar and top bar are
 *   not inside <main>, so with focus there, or nowhere, the page would not move. The keys scroll <main> directly
 *   and focus stays where it was, so a keyboard user does not lose their place in the sidebar. Elsewhere, such
 *   as in the page, in a dialog or in a field, the browser keeps its own behaviour.
 */
export function usePageScroll(main: RefObject<HTMLElement | null>, active: boolean): void {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();
  const offsets = useRef(new Map<string, number>());
  // Updated before paint, so a scroll event caused by the new page replacing the old one is filed under the new entry.
  const entry = useRef(key);
  const lastPath = useRef(pathname);

  useLayoutEffect(() => { entry.current = key; }, [key]);

  useEffect(() => {
    const node = main.current;
    if (!active || !node) return;
    const remember = () => offsets.current.set(entry.current, node.scrollTop);
    node.addEventListener("scroll", remember, { passive: true });
    return () => node.removeEventListener("scroll", remember);
  }, [main, active]);

  useEffect(() => {
    const node = main.current;
    const moved = lastPath.current !== pathname;
    lastPath.current = pathname;
    if (!active || !node) return;
    if (navigationType !== "POP") {
      if (moved) node.scrollTo?.(0, 0);
      return;
    }
    const target = offsets.current.get(key) ?? 0;
    let frame = 0;
    let tries = 0;
    const settle = () => {
      node.scrollTo?.(0, target);
      if (target === 0 || node.scrollTop >= target - 1 || (tries += 1) > RESTORE_FRAMES) return;
      frame = requestAnimationFrame(settle);
    };
    settle();
    return () => cancelAnimationFrame(frame);
  }, [main, active, pathname, key, navigationType]);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      const node = main.current;
      if (!node || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = document.activeElement;
      const nowhere = !target || target === document.body || target === document.documentElement;
      const inChrome = target instanceof Element && target.closest("[data-chrome]") !== null;
      if (!nowhere && !inChrome) return;
      // Space only scrolls when nothing is focused. On a focused link or button it keeps its own meaning.
      if (event.key === " " && !nowhere) return;
      const amount = travel(node, event.key, event.shiftKey);
      if (amount === null) return;
      event.preventDefault();
      const behavior = prefersReducedMotion() ? "auto" : "smooth";
      if (amount === "top") node.scrollTo?.({ top: 0, behavior });
      else if (amount === "bottom") node.scrollTo?.({ top: node.scrollHeight, behavior });
      else node.scrollBy?.({ top: amount, behavior });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [main, active]);
}
