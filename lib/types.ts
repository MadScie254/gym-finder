export type LatLng = {
  lat: number;
  lng: number;
};

export type Goal = "weight_loss" | "muscle" | "cardio" | "flexibility" | "sports";

export type Budget = "any" | "free";

export type Amenity = "weights" | "classes" | "pool" | "open_24h";

export type GymLabel = "best_match" | "closest" | "top_rated";

export type ClientProfile = {
  goals: Goal[];
  budget: Budget;
  amenities: Amenity[];
};

export type GymFilters = {
  openNow: boolean;
  minRating: number;
  price: Budget;
  radiusMeters: number;
};

export type GymReview = {
  text: string;
  rating: number | null;
};

export type Gym = {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  rating: number | null;
  userRatingCount: number;
  priceLevel: string | null;
  openNow: boolean | null;
  types: string[];
  photoName: string | null;
  googleMapsUri: string | null;
  phone: string | null;
  website: string | null;
  weekdayHours: string[];
  reviews: GymReview[];
  editorialSummary: string | null;
  distanceKm: number | null;
  score: number;
  labels: GymLabel[];
};

export type County = {
  name: string;
  lat: number;
  lng: number;
};

export const DEFAULT_PROFILE: ClientProfile = {
  goals: [],
  budget: "any",
  amenities: [],
};

export const DEFAULT_FILTERS: GymFilters = {
  openNow: false,
  minRating: 0,
  price: "any",
  radiusMeters: 5000,
};

export const GOAL_OPTIONS: { id: Goal; label: string; hint: string }[] = [
  { id: "weight_loss", label: "Weight loss", hint: "Fat burn & conditioning" },
  { id: "muscle", label: "Build muscle", hint: "Strength & weights" },
  { id: "cardio", label: "Cardio", hint: "Endurance & heart health" },
  { id: "flexibility", label: "Flexibility", hint: "Yoga, mobility, pilates" },
  { id: "sports", label: "Sports", hint: "Courts, classes, teams" },
];

export const BUDGET_OPTIONS: { id: Budget; label: string }[] = [
  { id: "any", label: "No fee preference" },
  { id: "free", label: "Mapped as free" },
];

export const AMENITY_OPTIONS: { id: Amenity; label: string }[] = [
  { id: "weights", label: "Free weights" },
  { id: "classes", label: "Group classes" },
  { id: "pool", label: "Pool" },
  { id: "open_24h", label: "Open 24 hours" },
];

export const RADIUS_OPTIONS = [
  { meters: 2000, label: "2 km" },
  { meters: 5000, label: "5 km" },
  { meters: 10000, label: "10 km" },
  { meters: 20000, label: "20 km" },
  { meters: 40000, label: "40 km" },
];
