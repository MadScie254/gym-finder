// Turn the week's meal plan into one shopping checklist, grouped by aisle.
// Built from the reviewed table in ../mealIngredients.ts, not from meal wording.
// Quantities are rough estimates for one person for one week.
import type { MealDay, PlanSettings } from "../../../lib/planner";
import { AISLES, INGREDIENTS, weeklyUses, type Aisle, type IngredientKey, type Unit } from "../mealIngredients";

export { AISLES, type Aisle };

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

/** Always needed to cook the week, whatever the meals. */
const STAPLES: Array<Omit<ListItem, "checked">> = [
  { id: "oil", name: "Cooking oil", aisle: "pantry", quantity: "500 ml" },
  { id: "salt", name: "Salt", aisle: "pantry", quantity: "1 small packet" },
  { id: "spices", name: "Spices you like (dhania, garlic, ginger)", aisle: "pantry", quantity: "As needed" },
];

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

/** Deduplicated checklist for the week: every ingredient once, amounts summed. */
export function buildShoppingList(diet: PlanSettings["diet"], days: MealDay[]): ListItem[] {
  const items: ListItem[] = [];
  for (const [key, total] of weeklyUses(diet, days)) {
    const ingredient = INGREDIENTS[key as IngredientKey];
    items.push({ id: key, name: ingredient.name, aisle: ingredient.aisle, quantity: formatQuantity(total, ingredient.unit), checked: false });
  }
  items.push(...STAPLES.map((staple) => ({ ...staple, checked: false })));
  return items.sort((a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.name.localeCompare(b.name));
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
