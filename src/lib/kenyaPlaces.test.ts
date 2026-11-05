import { describe, expect, it } from "vitest";
import { findLocalPlace, suggestKenyaPlaces } from "./kenyaPlaces";

describe("keyless Kenya place search", () => {
  it("resolves towns and neighbourhoods from the checked-in gazetteer", () => {
    expect(findLocalPlace("gyms in Webuye")?.name).toBe("Webuye");
    expect(findLocalPlace("Kilimani gyms")?.kind).toBe("suburb");
    expect(suggestKenyaPlaces("mom")[0]?.name).toBe("Mombasa");
  });

  it("does not claim an unrelated location", () => {
    expect(findLocalPlace("zzzxqnonexistentplace")).toBeNull();
  });
});
