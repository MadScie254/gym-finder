export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export type ShareTarget = { title: string; text?: string; url: string };

type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

/**
 * Web Share where the browser has it (phones), else copy the link. A dismissed share sheet is
 * "cancelled", not an error. Returns what happened so the caller can say it.
 */
export async function shareLink(target: ShareTarget, nav: ShareNavigator = typeof navigator !== "undefined" ? navigator : {}): Promise<ShareOutcome> {
  const data: ShareData = { title: target.title, text: target.text, url: target.url };
  if (typeof nav.share === "function" && (!nav.canShare || nav.canShare(data))) {
    try {
      await nav.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  if (nav.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(target.url);
      return "copied";
    } catch {
      return "failed";
    }
  }
  return "failed";
}

/** An absolute link to a path on the host serving the app. */
export function absoluteUrl(path: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
