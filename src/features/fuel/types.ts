// Shapes for the simulated Fuel stores (docs/REVAMP_PLAN.md section 2.1).
// Every store and item here is invented. Nothing maps to a real business.

export type StoreKind = "meal-prep" | "smoothie-bar" | "grocery" | "butchery";

export type ItemTag = "high-protein" | "vegetarian" | "post-workout" | "pre-workout" | "budget" | "breakfast";

/** When an item suits being eaten. Groceries are cooked at home. */
export type ItemMeal = "breakfast" | "main" | "snack" | "drink" | "grocery";

export type DemoItem = {
  id: string;
  name: string;
  /** Menu section heading, for example "Bowls" or "Produce". */
  section: string;
  /** What one unit is, for example "1 plate" or "1 kg". */
  unit: string;
  /** Sample price in Kenya shillings. Invented. */
  priceKes: number;
  /** Protein in grams per unit. An estimate, shown as one. */
  proteinG?: number;
  /** Energy per unit. An estimate, shown as one. */
  kcal?: number;
  tags: ItemTag[];
  meal: ItemMeal;
};

export type DemoHours = { days: string; open: string; close: string };

export type DemoStore = {
  id: string;
  /** Always starts with "Demo: ". */
  name: string;
  kind: StoreKind;
  area: string;
  town: string;
  /** Sample location near the area centre in data/kenya-places.json. No store is there. */
  location: { lat: number; lng: number };
  /** Which data/kenya-places.json centre the location was taken from. */
  placeId: string;
  hours: DemoHours[];
  items: DemoItem[];
};

export type DemoStoreFile = {
  note: string;
  stores: DemoStore[];
};
