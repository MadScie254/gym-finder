// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Poster } from "./Poster";

function parse(html: string): HTMLElement {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  // React 19 puts a preload <link> before a picture that asks for priority.
  return holder.querySelector(":scope > :not(link)") as HTMLElement;
}

describe("Poster", () => {
  it("puts the picture, the tab and the board in one labelled region", () => {
    const poster = parse(renderToStaticMarkup(
      <Poster photo="dumbbells" tab="Today" aria-labelledby="t"><h2 id="t">Full body A</h2></Poster>,
    ));
    expect(poster.tagName).toBe("SECTION");
    expect(poster.getAttribute("aria-labelledby")).toBe("t");
    expect(poster.querySelector("img")).not.toBeNull();
    expect(poster.textContent).toContain("Today");
    expect(poster.querySelector("h2")?.textContent).toBe("Full body A");
  });

  it("letters the tab across the picture, so it is a sibling of the picture's frame and the text stays off the photo", () => {
    const poster = parse(renderToStaticMarkup(<Poster photo="dumbbells" tab="Today"><p>Text</p></Poster>));
    const picture = poster.firstElementChild!;
    expect(picture.querySelector("img")).not.toBeNull();
    expect(picture.textContent).toBe("Today");
    expect(poster.lastElementChild!.textContent).toBe("Text");
  });

  it("is a board with its tab above the text when there is no picture", () => {
    const poster = parse(renderToStaticMarkup(<Poster tab="Today"><p>Text</p></Poster>));
    expect(poster.querySelector("img")).toBeNull();
    expect(poster.hasAttribute("data-photo")).toBe(false);
    expect(poster.firstElementChild!.textContent).toBe("TodayText");
  });

  it("has no tab at all when none is given", () => {
    const poster = parse(renderToStaticMarkup(<Poster photo="treadmills"><p>Text</p></Poster>));
    expect(poster.textContent).toBe("Text");
  });

  it("drops the tab in the side layout, which has no seam to letter across", () => {
    const poster = parse(renderToStaticMarkup(<Poster photo="treadmills" layout="side" tab="Today"><p>Text</p></Poster>));
    expect(poster.getAttribute("data-layout")).toBe("side");
    expect(poster.textContent).toBe("Text");
  });

  it("can be another element, and loads its picture first when asked", () => {
    const poster = parse(renderToStaticMarkup(<Poster as="article" photo="treadmills" priority><p>Text</p></Poster>));
    expect(poster.tagName).toBe("ARTICLE");
    expect(poster.querySelector("img")?.getAttribute("fetchpriority")).toBe("high");
  });
});
