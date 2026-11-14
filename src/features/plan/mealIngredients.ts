// Reviewed ingredient table for the 7-day meal plans in src/lib/planner.ts.
// Every meal lists what one person needs for one serving. The shopping
// checklist sums these, so quantities are estimates for one person for one
// week. No costs, calories or allergen claims are made from this table.
import type { MealDay, PlanSettings } from "../../lib/planner";

export const AISLES = ["produce", "grains", "protein", "dairy", "pantry"] as const;
export type Aisle = (typeof AISLES)[number];

export type Unit = "g" | "ml" | { one: string; many: string } | null;

export type Ingredient = { name: string; aisle: Aisle; unit: Unit };

const BUNCH = { one: "bunch", many: "bunches" };
const HEAD = { one: "head", many: "heads" };

export const INGREDIENTS = {
  greens: { name: "Sukuma wiki or other greens", aisle: "produce", unit: BUNCH },
  spinach: { name: "Spinach", aisle: "produce", unit: BUNCH },
  cabbage: { name: "Cabbage", aisle: "produce", unit: HEAD },
  tomatoes: { name: "Tomatoes", aisle: "produce", unit: null },
  onions: { name: "Onions", aisle: "produce", unit: null },
  cucumber: { name: "Cucumber", aisle: "produce", unit: null },
  avocado: { name: "Avocados", aisle: "produce", unit: null },
  vegetables: { name: "Mixed vegetables (carrots, peas, French beans)", aisle: "produce", unit: "g" },
  carrots: { name: "Carrots", aisle: "produce", unit: null },
  sweetPotato: { name: "Sweet potatoes", aisle: "produce", unit: "g" },
  matoke: { name: "Matoke (green bananas)", aisle: "produce", unit: null },
  banana: { name: "Bananas", aisle: "produce", unit: null },
  mango: { name: "Mangoes", aisle: "produce", unit: null },
  pawpaw: { name: "Pawpaw", aisle: "produce", unit: null },
  fruit: { name: "Seasonal fruit (oranges or what is in season)", aisle: "produce", unit: null },
  maize: { name: "Dry maize (for githeri)", aisle: "grains", unit: "g" },
  beans: { name: "Dry beans", aisle: "grains", unit: "g" },
  ndengu: { name: "Ndengu (green grams)", aisle: "grains", unit: "g" },
  lentils: { name: "Lentils", aisle: "grains", unit: "g" },
  rice: { name: "Rice", aisle: "grains", unit: "g" },
  maizeFlour: { name: "Maize flour (for ugali)", aisle: "grains", unit: "g" },
  ujiFlour: { name: "Maize or sorghum flour (for uji)", aisle: "grains", unit: "g" },
  milletFlour: { name: "Millet flour (for uji)", aisle: "grains", unit: "g" },
  oats: { name: "Rolled oats", aisle: "grains", unit: "g" },
  wheatFlour: { name: "Wheat flour (for chapati)", aisle: "grains", unit: "g" },
  bread: { name: "Whole-wheat bread", aisle: "grains", unit: { one: "slice", many: "slices" } },
  eggs: { name: "Eggs", aisle: "protein", unit: null },
  chicken: { name: "Chicken", aisle: "protein", unit: "g" },
  tilapia: { name: "Tilapia", aisle: "protein", unit: { one: "whole fish", many: "whole fish" } },
  fish: { name: "Fish fillet", aisle: "protein", unit: "g" },
  milk: { name: "Milk", aisle: "dairy", unit: "ml" },
  yoghurt: { name: "Plain yoghurt", aisle: "dairy", unit: "ml" },
  tea: { name: "Tea leaves or tea bags", aisle: "pantry", unit: { one: "serving", many: "servings" } },
} satisfies Record<string, Ingredient>;

export type IngredientKey = keyof typeof INGREDIENTS;
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type MealEntry = { text: string; uses: Partial<Record<IngredientKey, number>> };

type DayTable = Record<MealSlot, MealEntry>;

/** Mixed diet, one serving each. `text` must match the planner word for word (a test checks). */
const OMNIVORE: Record<string, DayTable> = {
  Monday: {
    breakfast: { text: "Porridge, milk and banana", uses: { ujiFlour: 60, milk: 250, banana: 1 } },
    lunch: { text: "Githeri with sukuma wiki and tomato", uses: { maize: 100, beans: 75, greens: 0.5, tomatoes: 1, onions: 0.5 } },
    dinner: { text: "Grilled chicken, ugali and mixed vegetables", uses: { chicken: 150, maizeFlour: 120, vegetables: 150 } },
    snack: { text: "Orange or seasonal fruit", uses: { fruit: 1 } },
  },
  Tuesday: {
    breakfast: { text: "Eggs, whole-wheat toast and fruit", uses: { eggs: 2, bread: 2, fruit: 1 } },
    lunch: { text: "Rice, ndengu and cabbage", uses: { rice: 75, ndengu: 75, cabbage: 0.25, onions: 0.5, tomatoes: 1 } },
    dinner: { text: "Tilapia, sweet potato and sukuma wiki", uses: { tilapia: 1, sweetPotato: 300, greens: 0.5 } },
    snack: { text: "Plain yoghurt", uses: { yoghurt: 150 } },
  },
  Wednesday: {
    breakfast: { text: "Oats, milk and mango", uses: { oats: 50, milk: 250, mango: 1 } },
    lunch: { text: "Bean stew, chapati and salad", uses: { beans: 75, wheatFlour: 100, tomatoes: 2, onions: 0.5, cucumber: 0.5 } },
    dinner: { text: "Chicken, matoke and greens", uses: { chicken: 150, matoke: 3, greens: 0.5, onions: 0.5, tomatoes: 1 } },
    snack: { text: "Banana", uses: { banana: 1 } },
  },
  Thursday: {
    breakfast: { text: "Boiled eggs, sweet potato and tea", uses: { eggs: 2, sweetPotato: 200, tea: 1 } },
    lunch: { text: "Githeri and avocado salad", uses: { maize: 100, beans: 75, avocado: 1, tomatoes: 1, onions: 0.5 } },
    dinner: { text: "Lentil stew, rice and spinach", uses: { lentils: 75, rice: 75, spinach: 0.5, onions: 0.5, tomatoes: 1 } },
    snack: { text: "Seasonal fruit", uses: { fruit: 1 } },
  },
  Friday: {
    breakfast: { text: "Plain yoghurt, oats and pawpaw", uses: { yoghurt: 150, oats: 50, pawpaw: 0.5 } },
    lunch: { text: "Tilapia, ugali and sukuma wiki", uses: { tilapia: 1, maizeFlour: 120, greens: 0.5 } },
    dinner: { text: "Beans, sweet potato and cabbage", uses: { beans: 75, sweetPotato: 300, cabbage: 0.25, onions: 0.5 } },
    snack: { text: "Carrot sticks", uses: { carrots: 2 } },
  },
  Saturday: {
    breakfast: { text: "Millet porridge and banana", uses: { milletFlour: 60, banana: 1 } },
    lunch: { text: "Chicken, rice and mixed vegetables", uses: { chicken: 150, rice: 75, vegetables: 150 } },
    dinner: { text: "Ndengu, chapati and salad", uses: { ndengu: 75, wheatFlour: 100, tomatoes: 2, onions: 0.5, cucumber: 0.5 } },
    snack: { text: "Seasonal fruit", uses: { fruit: 1 } },
  },
  Sunday: {
    breakfast: { text: "Eggs, toast and tomato", uses: { eggs: 2, bread: 2, tomatoes: 1 } },
    lunch: { text: "Bean stew, ugali and greens", uses: { beans: 75, maizeFlour: 120, greens: 0.5, onions: 0.5, tomatoes: 1 } },
    dinner: { text: "Fish, matoke and vegetables", uses: { fish: 150, matoke: 3, vegetables: 150 } },
    snack: { text: "Plain yoghurt or fruit", uses: { yoghurt: 150 } },
  },
};

/** The vegetarian plan swaps meat and fish in six meals; the rest match the mixed plan. */
const VEGETARIAN_CHANGES: Record<string, Partial<DayTable>> = {
  Monday: { dinner: { text: "Grilled tofu or beans, ugali and mixed vegetables", uses: { beans: 75, maizeFlour: 120, vegetables: 150, onions: 0.5 } } },
  Tuesday: { dinner: { text: "Ndengu, sweet potato and sukuma wiki", uses: { ndengu: 75, sweetPotato: 300, greens: 0.5, onions: 0.5 } } },
  Wednesday: { dinner: { text: "Lentils, matoke and greens", uses: { lentils: 75, matoke: 3, greens: 0.5, onions: 0.5, tomatoes: 1 } } },
  Friday: { lunch: { text: "Beans, ugali and sukuma wiki", uses: { beans: 75, maizeFlour: 120, greens: 0.5, onions: 0.5 } } },
  Saturday: { lunch: { text: "Lentils, rice and mixed vegetables", uses: { lentils: 75, rice: 75, vegetables: 150 } } },
  Sunday: { dinner: { text: "Ndengu, matoke and vegetables", uses: { ndengu: 75, matoke: 3, vegetables: 150, onions: 0.5 } } },
};

export function mealEntry(diet: PlanSettings["diet"], day: string, slot: MealSlot): MealEntry | undefined {
  if (diet === "vegetarian") {
    const change = VEGETARIAN_CHANGES[day]?.[slot];
    if (change) return change;
  }
  return OMNIVORE[day]?.[slot];
}

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

/** Total use of each ingredient across the week's meals. */
export function weeklyUses(diet: PlanSettings["diet"], days: MealDay[]): Map<IngredientKey, number> {
  const totals = new Map<IngredientKey, number>();
  for (const day of days) {
    for (const slot of MEAL_SLOTS) {
      const entry = mealEntry(diet, day.day, slot);
      if (!entry) continue;
      for (const [key, amount] of Object.entries(entry.uses) as Array<[IngredientKey, number]>) {
        totals.set(key, (totals.get(key) ?? 0) + amount);
      }
    }
  }
  return totals;
}

/**
 * Practical swaps, by ingredient, most useful first. Vegetarian swaps never
 * name meat or fish (a test checks).
 */
const SWAP_ORDER: IngredientKey[] = [
  "chicken", "tilapia", "fish", "eggs", "beans", "ndengu", "lentils", "maizeFlour", "wheatFlour", "rice",
  "ujiFlour", "milletFlour", "oats", "matoke", "sweetPotato", "greens", "spinach", "milk", "yoghurt",
];

export function swapKeys(entry: MealEntry, limit = 2): IngredientKey[] {
  return SWAP_ORDER.filter((key) => entry.uses[key] != null).slice(0, limit);
}
