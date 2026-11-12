// Turn the week's meal plan into one shopping list, grouped by aisle.
// Quantities are rough estimates for one person for one week.
import type { MealDay } from "../../lib/planner";

export const AISLES = ["produce", "grains", "protein", "dairy", "pantry"] as const;
export type Aisle = (typeof AISLES)[number];

type Unit = "g" | "ml" | { one: string; many: string } | null;

type Ingredient = {
  key: string;
  name: string;
  aisle: Aisle;
  /** How much one mention in a meal uses. */
  each: number;
  unit: Unit;
  match: RegExp;
};

const BUNCH = { one: "bunch", many: "bunches" };
const SLICE = { one: "slice", many: "slices" };
const HEAD = { one: "head", many: "heads" };

// Order does not matter: every ingredient is checked against every meal.
const INGREDIENTS: Ingredient[] = [
  { key: "greens", name: "Sukuma wiki or other greens", aisle: "produce", each: 0.5, unit: BUNCH, match: /sukuma wiki|\bgreens\b/i },
  { key: "spinach", name: "Spinach", aisle: "produce", each: 0.5, unit: BUNCH, match: /spinach/i },
  { key: "cabbage", name: "Cabbage", aisle: "produce", each: 0.25, unit: HEAD, match: /cabbage/i },
  { key: "tomatoes", name: "Tomatoes", aisle: "produce", each: 1, unit: null, match: /tomato|salad|stew/i },
  { key: "onions", name: "Onions", aisle: "produce", each: 0.5, unit: null, match: /stew|githeri|ndengu|beans|lentils/i },
  { key: "cucumber", name: "Cucumber", aisle: "produce", each: 0.5, unit: null, match: /(?<!avocado )salad/i },
  { key: "avocado", name: "Avocados", aisle: "produce", each: 1, unit: null, match: /avocado/i },
  { key: "vegetables", name: "Mixed vegetables (carrots, peas, French beans)", aisle: "produce", each: 250, unit: "g", match: /\bvegetables\b/i },
  { key: "carrots", name: "Carrots", aisle: "produce", each: 2, unit: null, match: /carrot/i },
  { key: "sweet-potato", name: "Sweet potatoes", aisle: "produce", each: 300, unit: "g", match: /sweet potato/i },
  { key: "matoke", name: "Matoke (green bananas)", aisle: "produce", each: 3, unit: null, match: /matoke/i },
  { key: "banana", name: "Bananas", aisle: "produce", each: 1, unit: null, match: /\bbanana\b/i },
  { key: "mango", name: "Mangoes", aisle: "produce", each: 1, unit: null, match: /mango/i },
  { key: "pawpaw", name: "Pawpaw", aisle: "produce", each: 0.5, unit: null, match: /pawpaw/i },
  { key: "fruit", name: "Seasonal fruit (oranges or what is in season)", aisle: "produce", each: 1, unit: null, match: /fruit/i },
  { key: "maize", name: "Dry maize (for githeri)", aisle: "grains", each: 100, unit: "g", match: /githeri/i },
  { key: "beans", name: "Dry beans", aisle: "grains", each: 75, unit: "g", match: /githeri|\bbeans?\b/i },
  { key: "ndengu", name: "Ndengu (green grams)", aisle: "grains", each: 75, unit: "g", match: /ndengu/i },
  { key: "lentils", name: "Lentils", aisle: "grains", each: 75, unit: "g", match: /lentil/i },
  { key: "rice", name: "Rice", aisle: "grains", each: 75, unit: "g", match: /\brice\b/i },
  { key: "maize-flour", name: "Maize flour (for ugali)", aisle: "grains", each: 120, unit: "g", match: /ugali/i },
  { key: "uji-flour", name: "Maize or sorghum flour (for uji)", aisle: "grains", each: 60, unit: "g", match: /(?<!millet )porridge/i },
  { key: "millet-flour", name: "Millet flour (for uji)", aisle: "grains", each: 60, unit: "g", match: /millet porridge/i },
  { key: "oats", name: "Rolled oats", aisle: "grains", each: 50, unit: "g", match: /oats/i },
  { key: "wheat-flour", name: "Wheat flour (for chapati)", aisle: "grains", each: 100, unit: "g", match: /chapati/i },
  { key: "bread", name: "Whole-wheat bread", aisle: "grains", each: 2, unit: SLICE, match: /toast/i },
  { key: "eggs", name: "Eggs", aisle: "protein", each: 2, unit: null, match: /\beggs\b/i },
  { key: "chicken", name: "Chicken", aisle: "protein", each: 150, unit: "g", match: /chicken/i },
  { key: "tilapia", name: "Tilapia", aisle: "protein", each: 1, unit: { one: "whole fish", many: "whole fish" }, match: /tilapia/i },
  { key: "fish", name: "Fish fillet", aisle: "protein", each: 150, unit: "g", match: /\bfish\b/i },
  { key: "tofu", name: "Tofu", aisle: "protein", each: 100, unit: "g", match: /tofu/i },
  { key: "milk", name: "Milk", aisle: "dairy", each: 250, unit: "ml", match: /\bmilk\b/i },
  { key: "yoghurt", name: "Plain yoghurt", aisle: "dairy", each: 150, unit: "ml", match: /yoghurt/i },
  { key: "tea", name: "Tea leaves", aisle: "pantry", each: 1, unit: { one: "small packet", many: "small packets" }, match: /\btea\b/i },
];

/** Always needed to cook the week, whatever the meals. */
const STAPLES: Array<Omit<ListItem, "checked">> = [
  { id: "oil", name: "Cooking oil", aisle: "pantry", quantity: "500 ml" },
  { id: "salt", name: "Salt", aisle: "pantry", quantity: "1 small packet" },
  { id: "spices", name: "Spices you like (dhania, garlic, ginger)", aisle: "pantry", quantity: "As needed" },
];

export type ListItem = {
  id: string;
  name: string;
  aisle: Aisle;
  /** Display text, for example "450 g" or "4 bunches". Users can edit it. */
  quantity: string;
  checked: boolean;
  /** Added by the user, not from the meal plan. */
  custom?: boolean;
};

export function formatQuantity(total: number, unit: Unit): string {
  if (unit === "g" || unit === "ml") {
    const big = unit === "g" ? "kg" : "litres";
    if (total >= 1000) return `${Math.ceil(total / 500) / 2} ${big}`;
    return `${Math.ceil(total / 50) * 50} ${unit}`;
  }
  const count = Math.ceil(total);
  if (!unit) return String(count);
  return `${count} ${count === 1 ? unit.one : unit.many}`;
}

export function mealTexts(days: MealDay[]): string[] {
  return days.flatMap((day) => [day.breakfast, day.lunch, day.dinner, day.snack]);
}

/** Deduplicated list for the week: every ingredient once, quantities summed. */
export function buildShoppingList(days: MealDay[]): ListItem[] {
  const meals = mealTexts(days);
  const items: ListItem[] = [];
  for (const ingredient of INGREDIENTS) {
    const uses = meals.filter((meal) => ingredient.match.test(meal)).length;
    if (!uses) continue;
    items.push({
      id: ingredient.key,
      name: ingredient.name,
      aisle: ingredient.aisle,
      quantity: formatQuantity(uses * ingredient.each, ingredient.unit),
      checked: false,
    });
  }
  items.push(...STAPLES.map((staple) => ({ ...staple, checked: false })));
  return items.sort((a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle));
}

export function groupByAisle(items: ListItem[]): Array<{ aisle: Aisle; items: ListItem[] }> {
  return AISLES.map((aisle) => ({ aisle, items: items.filter((item) => item.aisle === aisle) }))
    .filter((group) => group.items.length > 0);
}

/** Plain text for copy, share and WhatsApp. Ticked items are left out. */
export function listText(items: ListItem[], labels: { title: string; note: string; aisles: Record<Aisle, string> }): string {
  const open = items.filter((item) => !item.checked);
  const groups = groupByAisle(open).map((group) => [
    labels.aisles[group.aisle],
    ...group.items.map((item) => `- ${item.name}: ${item.quantity}`),
  ].join("\n"));
  return [labels.title, labels.note, ...groups].join("\n\n");
}

/** WhatsApp with the text filled in and no recipient, so the user picks the contact. */
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
