import { describe, expect, it } from "vitest";
import { buildMealPlan, DEFAULT_PLAN_SETTINGS } from "../../../lib/planner";
import { INGREDIENTS, MEAL_SLOTS, mealEntry, swapKeys } from "../mealIngredients";
import { AISLES, buildShoppingList, formatQuantity, groupByAisle, listText, whatsAppShareUrl } from "./shoppingList";

const omnivore = buildMealPlan(DEFAULT_PLAN_SETTINGS);
const vegetarian = buildMealPlan({ ...DEFAULT_PLAN_SETTINGS, diet: "vegetarian" });
const labels = {
  title: "Shopping list",
  note: "For one person for one week. Quantities are estimates.",
  aisles: { produce: "Produce", grains: "Grains and legumes", protein: "Protein", dairy: "Dairy", pantry: "Pantry" },
};
const MEAT = /chicken|tilapia|fish|beef|goat|meat/i;

describe("ingredient table", () => {
  it("has an entry for every meal of both plans, word for word", () => {
    for (const [diet, days] of [["omnivore", omnivore], ["vegetarian", vegetarian]] as const) {
      for (const day of days) {
        for (const slot of MEAL_SLOTS) {
          const entry = mealEntry(diet, day.day, slot);
          expect(entry?.text, `${diet} ${day.day} ${slot}`).toBe(day[slot]);
          expect(Object.keys(entry?.uses ?? {}).length, `${diet} ${day.day} ${slot}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("uses no meat or fish in vegetarian meals", () => {
    for (const day of vegetarian) {
      for (const slot of MEAL_SLOTS) {
        const keys = Object.keys(mealEntry("vegetarian", day.day, slot)?.uses ?? {});
        expect(keys.filter((key) => MEAT.test(INGREDIENTS[key as keyof typeof INGREDIENTS].name)), `${day.day} ${slot}`).toEqual([]);
        expect(swapKeys(mealEntry("vegetarian", day.day, slot)!).some((key) => MEAT.test(key))).toBe(false);
      }
    }
  });
});

describe("shopping checklist builder", () => {
  it("lists each ingredient once, in aisle order", () => {
    const list = buildShoppingList("omnivore", omnivore);
    expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
    const order = list.map((i) => AISLES.indexOf(i.aisle));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(groupByAisle(list).map((g) => g.aisle)).toEqual(["produce", "grains", "protein", "dairy", "pantry"]);
  });

  it("sums the same food across meals", () => {
    const list = buildShoppingList("omnivore", omnivore);
    // Githeri twice, bean stew twice, beans once: 5 x 75 g = 375 g, rounded up to 400 g.
    expect(list.find((i) => i.id === "beans")?.quantity).toBe("400 g");
    // Two eggs at three breakfasts.
    expect(list.find((i) => i.id === "eggs")?.quantity).toBe("6");
    // Chicken at three meals: 450 g.
    expect(list.find((i) => i.id === "chicken")?.quantity).toBe("450 g");
  });

  it("keeps meat and fish off a vegetarian list", () => {
    const list = buildShoppingList("vegetarian", vegetarian);
    expect(list.map((i) => i.name).join(" ")).not.toMatch(MEAT);
    expect(list.find((i) => i.id === "lentils")?.quantity).toBe("250 g");
  });

  it("rounds quantities to amounts you can buy", () => {
    expect(formatQuantity(430, "g")).toBe("450 g");
    expect(formatQuantity(1300, "g")).toBe("1.5 kg");
    expect(formatQuantity(1750, "ml")).toBe("2 litres");
    expect(formatQuantity(2.5, { one: "bunch", many: "bunches" })).toBe("3 bunches");
    expect(formatQuantity(1, { one: "bunch", many: "bunches" })).toBe("1 bunch");
    expect(formatQuantity(3.2, null)).toBe("4");
  });

  it("writes plain text without ticked items", () => {
    const list = buildShoppingList("omnivore", omnivore).map((i) => (i.id === "eggs" ? { ...i, checked: true } : i));
    const text = listText(list, labels);
    expect(text.startsWith("Shopping list\n\nFor one person for one week. Quantities are estimates.\n\nProduce\n- ")).toBe(true);
    expect(text).not.toContain("Eggs:");
    expect(text).toContain("- Rice: ");
  });

  it("opens WhatsApp with the text and no recipient", () => {
    const url = whatsAppShareUrl("Rice: 300 g\nEggs & milk");
    expect(url).toBe("https://wa.me/?text=Rice%3A%20300%20g%0AEggs%20%26%20milk");
    expect(new URL(url).pathname).toBe("/");
  });
});
