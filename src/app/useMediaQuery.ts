import { useSyncExternalStore } from "react";

/** Desktop layout (420 px rail plus map) from this width. */
export const WIDE_QUERY = "(min-width: 900px)";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia?.(query);
      media?.addEventListener("change", notify);
      return () => media?.removeEventListener("change", notify);
    },
    () => Boolean(window.matchMedia?.(query).matches),
    () => false,
  );
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}
