import { describe, expect, it } from "vitest";
import { isFitnessVenue } from "./fitnessVenue";
import { haversineKm, isInKenya, NAIROBI } from "./kenya";
import { catalogAllGyms, catalogNearbyGyms, catalogSearchGyms } from "./kenyaGymCatalog";
import source from "@/data/kenya-gyms.json";

describe("Kenya catalog integrity", () => {
  it("uses the country polygon, not just a rectangular bounding box", () => {
    expect(isInKenya(NAIROBI)).toBe(true);
    expect(isInKenya({ lat: -4.0435, lng: 39.6682 })).toBe(true); // Mombasa
    expect(isInKenya({ lat: -1.764, lng: 33.965 })).toBe(false); // Butiama, Tanzania
    expect(isInKenya({ lat: 0.3476, lng: 32.58 })).toBe(false); // Kampala
  });

  it("does not mistake generic sports facilities for gyms", () => {
    expect(isFitnessVenue({ name: "Football Ground", types: ["sports_centre", "football"] })).toBe(false);
    expect(isFitnessVenue({ name: "Unnamed", types: ["fitness_centre"] })).toBe(true);
    expect(isFitnessVenue({ name: "Fitness centre", types: ["fitness_centre"] })).toBe(false);
    expect(isFitnessVenue({ name: "University Gym Parking Lot", types: ["parking"] })).toBe(false);
    expect(isFitnessVenue({ name: "CrossFit Nairobi", types: ["sports_centre"] })).toBe(true);
  });

  it("keeps nearby results inside the requested radius and Kenya", () => {
    const radius = 2_000;
    const gyms = catalogNearbyGyms(NAIROBI, radius);
    expect(gyms.every((gym) => haversineKm(NAIROBI, gym.location) <= radius / 1000)).toBe(true);
    expect(catalogAllGyms(NAIROBI).every((gym) => isInKenya(gym.location) && isFitnessVenue(gym))).toBe(true);
    expect(catalogAllGyms(NAIROBI)).toHaveLength(source.count);
  });

  it("returns no unrelated gyms for a nonsense search", () => {
    expect(catalogSearchGyms("zzzxqnonexistentgym")).toEqual([]);
  });
});
