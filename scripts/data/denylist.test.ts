import { describe, expect, it } from "vitest";
import { denyMatch, softDenyReason } from "./denylist.mjs";

describe("name deny-list", () => {
  it("matches the brief's terms", () => {
    const hits: [string, string][] = [
      ["Home_gym Equipments", "equipment"],
      ["Alpha Supplements", "supplement"],
      ["Steppin Razors Kinyozi and Fitness Centre", "kinyozi"],
      ["Rollin Total Fitness-Health and Fitness Consultant & Supplements Store", "supplement"],
      ["Classic Gym and Executive Salon", "salon"],
      ["Strong Barbershop", "barber"],
      ["City Pharmacy", "pharmacy"],
      ["Shauri Moyo Primary School Gym", "primary school"],
      ["Little Stars Nursery", "nursery"],
    ];
    for (const [name, term] of hits) expect(denyMatch(name), name).toBe(term);
  });

  it("does not match legitimate names: Academy and Club can be real", () => {
    for (const name of ["Black Heroes Taekwondo Academy", "Parklands Sports Club", "Level 24 Gym and Fitness Centre", "Primary Fitness", "Equip Gym"]) {
      expect(denyMatch(name), name).toBeNull();
    }
  });
});

describe("soft deny (name does not read as a gym)", () => {
  it("flags hotels, halls and stadiums with no fitness word", () => {
    expect(softDenyReason("Brimak Hotel")).toBe("hotel");
    expect(softDenyReason("Majengo Village Hall")).toBe("hall");
    expect(softDenyReason("Kitui Showground")).toBe("showground");
    expect(softDenyReason("Crestmed Health Sciences Training College")).toBe("college");
  });

  it("never flags a name with a fitness word", () => {
    for (const name of ["Pivot Hotel and Fitness Centre", "Westgate Villas & Gym", "Great Rift Valley Golf Resort Gym", "Kenyatta University Gymnasium", "Karen Sports Club Hall"]) {
      expect(softDenyReason(name), name).toBeNull();
    }
    expect(softDenyReason("Eagle Camp Mida Creek")).toBeNull();
  });
});
