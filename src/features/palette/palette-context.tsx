import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isPaletteShortcut } from "./shortcut";

export type PaletteValue = { open: boolean; show: () => void; hide: () => void };

const PaletteContext = createContext<PaletteValue | null>(null);

const loadPalette = () => import("./CommandPalette");
const CommandPalette = lazy(loadPalette);

/** Start fetching the palette before it is asked for, for example when the pointer reaches its button. */
export function preloadPalette(): void {
  void loadPalette();
}

/**
 * Owns whether the quick-actions palette is open and the one global shortcut for it. The palette itself is a
 * separate chunk, fetched the first time it opens. The shortcut works while a text field has focus. It is left
 * alone while another dialog (Report, Filters) is open, so that dialog keeps the keyboard.
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isPaletteShortcut(event)) return;
      if (document.querySelector('[role="dialog"][data-state="open"]:not([data-palette])')) return;
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
        <Suspense fallback={null}>
          <CommandPalette onClose={hide} />
        </Suspense>
      )}
    </PaletteContext.Provider>
  );
}

export function usePalette(): PaletteValue {
  const value = useContext(PaletteContext);
  if (!value) throw new Error("usePalette outside PaletteProvider");
  return value;
}
