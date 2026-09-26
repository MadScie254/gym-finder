import { describe, expect, it } from "vitest";

import { directionsUrl, safeExternalUrl, safeTelephoneUrl } from "./format";

describe("external contact helpers", () => {
  it("only permits http and https website URLs", () => {
    expect(safeExternalUrl("https://example.com/fitness")).toBe("https://example.com/fitness");
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com/");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,test")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
  });

  it("normalizes only plausible phone numbers into tel links", () => {
    expect(safeTelephoneUrl("+254 (700) 123-456")).toBe("tel:+254700123456");
    expect(safeTelephoneUrl("0700 123 456")).toBe("tel:0700123456");
    expect(safeTelephoneUrl("call reception")).toBeNull();
    expect(safeTelephoneUrl("123")).toBeNull();
  });

  it("opens an actual directions route to the gym coordinates", () => {
    expect(directionsUrl(-1.286, 36.817)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-1.286%2C36.817",
    );
  });
});
