import { useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import styles from "./Sheet.module.css";

export type SheetStop = "peek" | "half" | "full";
export const SHEET_STOPS: readonly SheetStop[] = ["peek", "half", "full"];

const STOP_WORD: Record<SheetStop, string> = { peek: "peeking", half: "half open", full: "fully open" };
const DRAG_THRESHOLD_PX = 6;

export type SheetProps = {
  /** Names the region, for example "Gyms near you". */
  title: string;
  stop: SheetStop;
  onStopChange: (stop: SheetStop) => void;
  /** Visible height at the peek stop, in px. */
  peekHeight?: number;
  /** Shown beside the handle, always visible, even at peek. */
  header?: ReactNode;
  children: ReactNode;
};

/**
 * Mobile bottom sheet with peek, half and full stops. It is a persistent region,
 * not a modal: the map behind it stays usable. Place it inside a positioned
 * parent that has a height (the map area). Drag the handle, tap it to cycle,
 * or focus it and use the arrow keys. Motion is off under reduced motion.
 */
export function Sheet({ title, stop, onStopChange, peekHeight = 148, header, children }: SheetProps) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const titleId = useId();
  const index = SHEET_STOPS.indexOf(stop);

  function heightOf(target: SheetStop): number {
    const parent = ref.current?.parentElement?.getBoundingClientRect().height ?? 0;
    if (target === "peek") return peekHeight;
    if (target === "half") return parent * 0.5;
    return parent - 48;
  }

  function step(delta: number) {
    const next = SHEET_STOPS[Math.min(SHEET_STOPS.length - 1, Math.max(0, index + delta))];
    if (next !== stop) onStopChange(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const moves: Record<string, () => void> = {
      ArrowUp: () => step(1),
      ArrowDown: () => step(-1),
      Home: () => onStopChange("peek"),
      End: () => onStopChange("full"),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!ref.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: ref.current.getBoundingClientRect().height, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;
    const dy = state.startY - event.clientY;
    if (!state.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    state.moved = true;
    setDragHeight(Math.min(heightOf("full"), Math.max(peekHeight * 0.6, state.startHeight + dy)));
  }

  function onPointerUp() {
    const state = drag.current;
    if (!state) return;
    if (state.moved && dragHeight != null) {
      const nearest = SHEET_STOPS.reduce((best, item) =>
        Math.abs(heightOf(item) - dragHeight) < Math.abs(heightOf(best) - dragHeight) ? item : best);
      onStopChange(nearest);
    }
    setDragHeight(null);
    window.setTimeout(() => { drag.current = null; }, 0);
  }

  function onClick() {
    if (drag.current?.moved) return;
    onStopChange(SHEET_STOPS[(index + 1) % SHEET_STOPS.length]);
  }

  const style = {
    "--sheet-peek": `${peekHeight}px`,
    ...(dragHeight != null ? { height: `${dragHeight}px`, transition: "none" } : {}),
  } as CSSProperties;

  return (
    <section ref={ref} className={styles.sheet} data-stop={stop} style={style} aria-labelledby={titleId}>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.handle}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label={`Resize ${title} panel, ${STOP_WORD[stop]}`}
          aria-describedby={`${titleId}-hint`}
        >
          <span className={styles.grip} aria-hidden="true" />
        </button>
        <span id={`${titleId}-hint`} className="sr-only">Press to cycle sizes, or use the up and down arrow keys.</span>
        <h2 id={titleId} className={styles.title}>{title}</h2>
        {header}
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
