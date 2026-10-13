import { describe, expect, it } from "vitest";
import { normalizePhones, phoneKind, splitPhoneField, whatsappChoice, whatsappFrom } from "./phones.mjs";
import { canonicalUrl, classifyUrls, hostOf, isSocialOrAggregatorHost, sameWebsiteHost } from "./urls.mjs";

describe("phones", () => {
  it("normalises Kenyan numbers in every common format to E.164", () => {
    const { phones, dropped } = normalizePhones(["0733758380", "+254733758380", "254733 758 380", "0110123456", "+254 20 222 3344", "020-2223344"]);
    expect(phones).toEqual(["+254733758380", "+254110123456", "+254202223344"]);
    expect(dropped).toEqual([]);
  });

  it("classifies mobile and fixed from the library (01xx is a mobile range now)", () => {
    expect(phoneKind("+254733758380")).toBe("mobile");
    expect(phoneKind("+254110123456")).toBe("mobile");
    expect(phoneKind("+254202223344")).toBe("fixed");
    expect(normalizePhones(["0733758380", "0202223344"]).types).toEqual({ "+254733758380": "mobile", "+254202223344": "fixed" });
  });

  it("drops (and reports) numbers that do not validate or are not Kenyan", () => {
    const { phones, dropped } = normalizePhones(["+255712345678", "+44 7911 123456", "12345", "--", "0254731758371", null, ""]);
    expect(phones).toEqual([]);
    expect(dropped).toEqual(["+255712345678", "+44 7911 123456", "12345", "--", "0254731758371"]);
  });

  it("splits several numbers held in one field", () => {
    expect(splitPhoneField("0722 784664 / 0733 758380; +254 20 2223344, 0700111222 or 0700333444")).toHaveLength(5);
    expect(normalizePhones(["0722784664;0722784664"]).phones).toEqual(["+254722784664"]);
  });

  it("WhatsApp: explicit tag is trusted, otherwise only a mobile is a guess", () => {
    expect(whatsappChoice(["+254202223344"], null)).toBeNull();
    expect(whatsappChoice(["+254202223344", "+254733758380"], null)).toEqual({ number: "+254733758380", source: "mobile-guess" });
    expect(whatsappChoice(["+254733758380"], "0700 111 222")).toEqual({ number: "+254700111222", source: "osm" });
    expect(whatsappFrom([], "not a number")).toBeNull();
  });
});

describe("urls", () => {
  it("strips tracking params and fragments and lower-cases the host", () => {
    expect(canonicalUrl("HTTPS://WWW.Example.CO.KE/Gym?utm_source=a&fbclid=b&id=7#top")?.toString()).toBe("https://www.example.co.ke/Gym?id=7");
    expect(canonicalUrl("example.co.ke")?.toString()).toBe("https://example.co.ke/");
  });

  it("rejects anything that is not http(s)", () => {
    for (const bad of ["javascript:alert(1)", "mailto:a@b.ke", "tel:+254700", "ftp://x.ke/", "data:text/html,hi", "", "not a url"]) {
      expect(canonicalUrl(bad)).toBeNull();
    }
  });

  it("separates own website, Facebook and Instagram; other socials and short links are dropped", () => {
    const out = classifyUrls([
      "https://m.facebook.com/examplegym?ref=x",
      "https://instagram.com/examplegym?igshid=1",
      "https://twitter.com/examplegym",
      "https://linktr.ee/examplegym",
      "https://maps.app.goo.gl/abc",
      "https://g.co/kgs/abc",
      "https://www.google.com/maps/place/x",
      "http://examplegym.co.ke/",
    ]);
    expect(out.website).toBe("http://examplegym.co.ke/");
    expect(out.facebook).toBe("https://www.facebook.com/examplegym");
    expect(out.instagram).toBe("https://www.instagram.com/examplegym/");
    expect(out.dropped).toHaveLength(5);
    expect(classifyUrls(["https://www.facebook.com/examplegym"]).website).toBeNull();
    expect(classifyUrls(["https://www.facebook.com/sharer/sharer.php?u=x"]).facebook).toBeNull();
  });

  it("accepts bare social handles when the tag says which network", () => {
    expect(classifyUrls([{ url: "@eafitness", hint: "instagram" }]).instagram).toBe("https://www.instagram.com/eafitness/");
    expect(classifyUrls([{ url: "eafitness", hint: "facebook" }]).facebook).toBe("https://www.facebook.com/eafitness");
  });

  it("prefers https for the same host, but does not rewrite an http-only site", () => {
    expect(classifyUrls(["http://a.co.ke/", "https://a.co.ke/"]).website).toBe("https://a.co.ke/");
    expect(classifyUrls(["http://a.co.ke/"]).website).toBe("http://a.co.ke/");
    expect(classifyUrls(["https://sites.google.com/view/mygym"]).website).toBe("https://sites.google.com/view/mygym");
  });

  it("same-host test ignores www and every social/aggregator host", () => {
    expect(sameWebsiteHost("https://www.a.co.ke/x", "http://a.co.ke/")).toBe(true);
    expect(sameWebsiteHost("https://facebook.com/a", "https://facebook.com/b")).toBe(false);
    expect(isSocialOrAggregatorHost(hostOf("https://l.facebook.com/x"))).toBe(false);
    expect(isSocialOrAggregatorHost(hostOf("https://www.youtube.com/c/x"))).toBe(true);
  });
});
