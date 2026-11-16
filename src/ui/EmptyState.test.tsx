import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

it("renders an h2 by default, so it fits inside a page that has its own h1", () => {
  expect(renderToStaticMarkup(<EmptyState title="Nothing here" />)).toContain("<h2");
});

it("renders an h1 when the empty state is the whole page, as on a not-found route", () => {
  const html = renderToStaticMarkup(<EmptyState title="Page not found" level={1} />);
  expect(html).toContain("<h1");
  expect(html).not.toContain("<h2");
});

it("shows a picture in place of the icon when given one, and keeps it out of the accessibility tree", () => {
  const html = renderToStaticMarkup(<EmptyState title="Nothing saved" photo="dumbbells" icon={() => <svg data-icon="" />} />);
  expect(html).toContain("<img");
  expect(html).toContain('alt=""');
  expect(html).not.toContain("data-icon");
});

it("renders an h3 for a nested empty state", () => {
  expect(renderToStaticMarkup(<EmptyState title="No notes" level={3} />)).toContain("<h3");
});
