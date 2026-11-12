import { describe, expect, it } from "vitest";
import { buildMealPlan, DEFAULT_PLAN_SETTINGS } from "../../lib/planner";
import { buildShoppingList, formatQuantity, groupByAisle, listText, mealTexts, whatsAppShareUrl, AISLES } from "./shoppingList";

const omnivore = buildMealPlan(DEFAULT_PLAN_SETTINGS);
const vegetarian = buildMealPlan({ ...DEFAULT_PLAN_SETTINGS, diet: "vegetarian" });
const labels = {
  title: "Shopping list",
  note: "For one person for one week. Quantities are estimates.",
  aisles: { produce: "Produce", grains: "Grains and legumes", protein: "Protein", dairy: "Dairy", pantry: "Pantry" },
};

describe("shopping list builder", () => {
  it("lists each ingredient once, in aisle order", () => {
    const list = buildShoppingList(omnivore);
    expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
    const order = list.map((i) => AISLES.indexOf(i.aisle));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(groupByAisle(list).map((g) => g.aisle)).toEqual(["produce", "grains", "protein", "dairy", "pantry"]);
  });

  it("merges the same food from different meals", () => {
    const list = buildShoppingList(omnivore);
    // Githeri (twice) and bean stew (twice) and beans (once) all need dry beans: 5 x 75 g.
    expect(list.find((i) => i.id === "beans")?.quantity).toBe("400 g");
    // Sukuma wiki and "greens" are one item.
    expect(list.filter((i) => /sukuma|greens/i.test(i.name))).toHaveLength(1);
  });

  it("covers every meal of the week with at least one item", () => {
    const list = buildShoppingList(omnivore);
    expect(list.length).toBeGreaterThan(20);
    expect(mealTexts(omnivore)).toHaveLength(28);
  });

  it("keeps meat and fish off a vegetarian list", () => {
    const list = buildShoppingList(vegetarian);
    expect(list.map((i) => i.name).join(" ")).not.toMatch(/chicken|tilapia|fish/i);
    expect(list.some((i) => i.id === "lentils")).toBe(true);
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
    const list = buildShoppingList(omnivore).map((i) => (i.id === "eggs" ? { ...i, checked: true } : i));
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
