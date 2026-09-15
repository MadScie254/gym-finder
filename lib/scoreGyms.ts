import { haversineKm } from "./kenya";
import type {
  Amenity,
  Budget,
  ClientProfile,
  Goal,
  Gym,
  GymFilters,
  GymLabel,
  LatLng,
} from "./types";

const GOAL_KEYWORDS: Record<Goal, string[]> = {
  weight_loss: ["weight", "loss", "hiit", "cardio", "spin", "fat", "bootcamp", "conditioning"],
  muscle: ["muscle", "strength", "weight", "powerlift", "bodybuild", "dumbbell", "barbell", "hypertrophy"],
  cardio: ["cardio", "run", "treadmill", "cycle", "spin", "endurance", "aerobic"],
  flexibility: ["yoga", "pilates", "stretch", "mobility", "flex", "barre"],
  sports: ["sport", "court", "football", "basketball", "boxing", "mma", "tennis", "swim"],
};

const AMENITY_KEYWORDS: Record<Amenity, string[]> = {
  weights: ["weight", "strength", "dumbbell", "barbell", "power rack", "machine"],
  classes: ["class", "aerobics", "zumba", "yoga", "spin", "hiit", "les mills"],
  pool: ["pool", "swim", "aquatic"],
  open_24h: ["24", "24hr", "24-hour", "24 hour", "always open"],
};

const PRICE_MATCH: Record<Exclude<Budget, "any">, string[]> = {
  free: ["PRICE_LEVEL_FREE"],
};

function haystack(gym: Gym): string {
  const reviewText = gym.reviews.map((review) => review.text).join(" ");
  return [
    gym.name,
    gym.address,
    gym.editorialSummary ?? "",
    gym.types.join(" "),
    gym.weekdayHours.join(" "),
    reviewText,
  ]
    .join(" ")
    .toLowerCase();
}

function keywordHits(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
}

function budgetMatches(gym: Gym, budget: Budget): boolean {
  if (budget === "any") return true;
  if (!gym.priceLevel) return false;
  return PRICE_MATCH[budget].includes(gym.priceLevel);
}

export function scoreGym(gym: Gym, origin: LatLng, profile: ClientProfile): Gym {
  const distanceKm = haversineKm(origin, gym.location);
  const distanceScore = (1 / (1 + distanceKm / 2)) * 40;
  const rating = gym.rating ?? 0;
  const reviews = gym.userRatingCount;
  const ratingScore = (rating / 5) * (1 - 1 / (1 + reviews / 20)) * 30;
  const openBonus = gym.openNow ? 8 : 0;

  const text = haystack(gym);
  let goalScore = 0;
  if (profile.goals.length > 0) {
    const hits = profile.goals.reduce(
      (sum, goal) => sum + keywordHits(text, GOAL_KEYWORDS[goal]),
      0,
    );
    goalScore = Math.min(8, hits * 2);
  }

  let budgetScore = 4;
  if (profile.budget !== "any") {
    budgetScore = budgetMatches(gym, profile.budget) ? 10 : gym.priceLevel ? 0 : 4;
  }

  let amenityScore = 0;
  if (profile.amenities.length > 0) {
    const hits = profile.amenities.reduce(
      (sum, amenity) => sum + keywordHits(text, AMENITY_KEYWORDS[amenity]),
      0,
    );
    amenityScore = Math.min(4, hits * 1.5);
  }

  return {
    ...gym,
    distanceKm,
    score: Number(
      (distanceScore + ratingScore + openBonus + goalScore + budgetScore + amenityScore).toFixed(2),
    ),
  };
}

export function applyFilters(gyms: Gym[], filters: GymFilters): Gym[] {
  return gyms.filter((gym) => {
    // OSM opening-hours strings are not fully parsed here. A true value means
    // the venue explicitly declared 24/7 access; unknown hours are excluded.
    if (filters.openNow && gym.openNow !== true) return false;
    if (filters.minRating > 0 && (gym.rating ?? 0) < filters.minRating) return false;
    if (!budgetMatches(gym, filters.price)) return false;
    return true;
  });
}

export function rankGyms(gyms: Gym[], origin: LatLng, profile: ClientProfile, filters: GymFilters): Gym[] {
  const scored = applyFilters(
    gyms.map((gym) => scoreGym(gym, origin, profile)),
    filters,
  ).sort((a, b) => b.score - a.score);

  if (scored.length === 0) return scored;

  const labels = new Map<string, GymLabel[]>();
  const best = scored[0];
  labels.set(best.id, ["best_match"]);

  const closest = [...scored].sort(
    (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  )[0];
  if (closest && closest.id !== best.id) {
    labels.set(closest.id, [...(labels.get(closest.id) ?? []), "closest"]);
  } else if (closest) {
    labels.set(closest.id, [...(labels.get(closest.id) ?? []), "closest"]);
  }

  const rated = scored.filter((gym) => gym.rating != null);
  const topRated = [...rated].sort((a, b) => {
    const ratingDelta = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDelta !== 0) return ratingDelta;
    return b.userRatingCount - a.userRatingCount;
  })[0];
  if (topRated) {
    const current = labels.get(topRated.id) ?? [];
    if (!current.includes("top_rated")) {
      labels.set(topRated.id, [...current, "top_rated"]);
    }
  }

  return scored.map((gym) => ({
    ...gym,
    labels: labels.get(gym.id) ?? [],
  }));
}
