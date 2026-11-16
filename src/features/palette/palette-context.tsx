import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isPaletteShortcut } from "./shortcut";

export type PaletteValue = { open: boolean; show: () => void; hide: () => void };

const PaletteContext = createContext<PaletteValue | null>(null);

const loadPalette = () => import("./CommandPalette");
// A lazy component remembers a failed load for good. After one, a fresh one is made so the next open tries again.
let CommandPalette = lazy(loadPalette);

/** Start fetching the palette before it is asked for, for example when the pointer reaches its button. */
export function preloadPalette(): void {
  loadPalette().catch(() => undefined);
}

/** A modal dialog (Report, Filters) owns the keyboard while it is open. A popover, such as the menu, does not. */
function anotherDialogIsOpen(): boolean {
  return [...document.querySelectorAll('[role="dialog"][data-state="open"]:not([data-palette])')]
    .some((dialog) => !dialog.closest("[data-radix-popper-content-wrapper]"));
}

/**
 * Catches a palette that could not load, for example a script that no longer exists after a new deploy. The
 * palette closes and the rest of the app carries on; the next open tries to fetch it again.
 */
class PaletteBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { CommandPalette = lazy(loadPalette); this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * Owns whether the quick-actions palette is open and the one global shortcut for it. The palette itself is a
 * separate chunk, fetched the first time it opens. The shortcut works while a text field has focus. It is left
 * alone while a modal dialog is open, so that dialog keeps the keyboard.
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isPaletteShortcut(event)) return;
      if (anotherDialogIsOpen()) return;
      event.preventDefault();
      if (!event.repeat) setOpen((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, show, hide }), [open, show, hide]);

  return (
    <PaletteContext.Provider value={value}>
      {children}
      {open && (
        <PaletteBoundary onFail={hide}>
          <Suspense fallback={null}>
            <CommandPalette onClose={hide} />
          </Suspense>
        </PaletteBoundary>
      )}
    </PaletteContext.Provider>
  );
}

export function usePalette(): PaletteValue {
  const value = useContext(PaletteContext);
  if (!value) throw new Error("usePalette outside PaletteProvider");
  return value;
}
