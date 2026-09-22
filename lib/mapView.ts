export type MapPadding = { top: number; right: number; bottom: number; left: number };

/**
 * Decide whether to swap the interactive map for the static fallback.
 *
 * The fallback must only ever replace a map that has NOT yet drawn tiles. Once
 * the basemap is live, transient raster-tile errors (a flaky upstream, or edge
 * tiles) must leave gaps rather than blank the whole map — otherwise the map
 * "appears and then disappears" mid-session. `usedFallback` makes the decision
 * fire at most once per map instance.
 */
export function shouldFallbackOnError(
  state: { hasRendered: boolean; usedFallback: boolean; errorCount: number },
  threshold = 4,
): boolean {
  return !state.hasRendered && !state.usedFallback && state.errorCount >= threshold;
}

/**
 * Clamp map padding so it never exceeds the drawable area. MapLibre's
 * easeTo/fitBounds throw ("cannot fit within canvas") when padding is larger
 * than the container, which would fire map error events after a search on
 * smaller viewports. Keep at least `margin` pixels of drawable space per axis.
 */
export function clampPadding(
  padding: MapPadding,
  width: number,
  height: number,
  margin = 40,
): MapPadding {
  const pad = { ...padding };
  const maxHorizontal = Math.max(0, width - margin);
  const maxVertical = Math.max(0, height - margin);

  if (width > 0 && pad.left + pad.right > maxHorizontal) {
    const scale = maxHorizontal / (pad.left + pad.right);
    pad.left = Math.floor(pad.left * scale);
    pad.right = Math.floor(pad.right * scale);
  }
  if (height > 0 && pad.top + pad.bottom > maxVertical) {
    const scale = maxVertical / (pad.top + pad.bottom);
    pad.top = Math.floor(pad.top * scale);
    pad.bottom = Math.floor(pad.bottom * scale);
  }
  return pad;
}
