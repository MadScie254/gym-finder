import { describe, expect, it, vi } from "vitest";
import { absoluteUrl, shareLink } from "./share";

const target = { title: "Dojo", url: "https://app.test/gym/dojo" };

describe("share", () => {
  it("uses the Web Share API when the browser has it", async () => {
    const share = vi.fn(async () => undefined);
    expect(await shareLink(target, { share })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Dojo", text: undefined, url: "https://app.test/gym/dojo" });
  });

  it("treats a dismissed share sheet as cancelled, not an error", async () => {
    const share = vi.fn(async () => { throw Object.assign(new Error("no"), { name: "AbortError" }); });
    expect(await shareLink(target, { share })).toBe("cancelled");
  });

  it("copies the link when Web Share is missing or fails", async () => {
    const writeText = vi.fn(async () => undefined);
    expect(await shareLink(target, { clipboard: { writeText } })).toBe("copied");
    const share = vi.fn(async () => { throw new Error("NotAllowed"); });
    expect(await shareLink(target, { share, clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://app.test/gym/dojo");
  });

  it("says so when neither works", async () => {
    expect(await shareLink(target, {})).toBe("failed");
    expect(await shareLink(target, { clipboard: { writeText: async () => { throw new Error("denied"); } } })).toBe("failed");
  });

  it("builds absolute links on the current host", () => {
    expect(absoluteUrl("/saved?list=a", "https://x.test")).toBe("https://x.test/saved?list=a");
    expect(absoluteUrl("compare", "https://x.test")).toBe("https://x.test/compare");
  });
});
