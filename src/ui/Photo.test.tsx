// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PHOTO_IDS, PHOTOS } from "../assets/photos";
import { Photo } from "./Photo";

function image(html: string): HTMLImageElement {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.querySelector("img")!;
}

describe("Photo", () => {
  it("lets the browser pick a file by width, and starts from the middle one", () => {
    const img = image(renderToStaticMarkup(<Photo id="dumbbells" sizes="100vw" />));
    const photo = PHOTOS.dumbbells;
    expect(img.getAttribute("srcset")).toBe(photo.files.map((file) => `${file.src} ${file.w}w`).join(", "));
    expect(img.getAttribute("src")).toBe(photo.files[1].src);
    expect(img.getAttribute("sizes")).toBe("100vw");
    expect(img.getAttribute("width")).toBe(String(photo.width));
    expect(img.getAttribute("height")).toBe(String(photo.height));
  });

  it("is decoration by default, and described only when asked", () => {
    expect(image(renderToStaticMarkup(<Photo id="treadmills" sizes="100vw" />)).getAttribute("alt")).toBe("");
    expect(image(renderToStaticMarkup(<Photo id="treadmills" sizes="100vw" describe />)).getAttribute("alt")).toBe(PHOTOS.treadmills.alt);
  });

  it("loads lazily, except the one picture a page waits for", () => {
    const lazy = image(renderToStaticMarkup(<Photo id="treadmills" sizes="100vw" />));
    expect(lazy.getAttribute("loading")).toBe("lazy");
    expect(lazy.getAttribute("fetchpriority")).toBe("auto");
    const first = image(renderToStaticMarkup(<Photo id="treadmills" sizes="100vw" priority />));
    expect(first.getAttribute("loading")).toBe("eager");
    expect(first.getAttribute("fetchpriority")).toBe("high");
  });

  it("shows the picture's average colour behind it, and keeps its subject in frame", () => {
    const img = image(renderToStaticMarkup(<Photo id="boxing-room" sizes="100vw" />));
    expect(img.style.backgroundColor).not.toBe("");
    expect(img.style.objectPosition).toBe(PHOTOS["boxing-room"].focus);
  });

  it("copes with a picture that has only two files", () => {
    const only = PHOTOS["ugali-plates"];
    expect(only.files).toHaveLength(2);
    expect(image(renderToStaticMarkup(<Photo id="ugali-plates" sizes="100vw" />)).getAttribute("src")).toBe(only.files[1].src);
  });
});

describe("the photo catalogue", () => {
  it("credits every picture and names a free licence", () => {
    expect(PHOTO_IDS.length).toBeGreaterThanOrEqual(6);
    for (const id of PHOTO_IDS) {
      const { credit, alt, files } = PHOTOS[id];
      expect(credit.author.trim()).not.toBe("");
      expect(credit.page).toMatch(/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-\d+\/$/);
      expect(credit.licence).toBe("Pexels License");
      expect(alt.trim()).not.toBe("");
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) expect(file.src).toMatch(new RegExp(`^/photos/${id}-${file.w}-[0-9a-f]{8}\\.webp$`));
    }
  });

  it("lists files narrowest first, which Photo relies on", () => {
    for (const id of PHOTO_IDS) {
      const widths = PHOTOS[id].files.map((file) => file.w);
      expect(widths).toEqual([...widths].sort((a, b) => a - b));
    }
  });
});
