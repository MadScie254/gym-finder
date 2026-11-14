// The user's shopping list, saved on this device with their ticks and edits.
import { useCallback, useState } from "react";
import type { PlanSettings } from "../../lib/planner";
import { AISLES, type Aisle, type ListItem } from "./shoppingList";

const LIST_KEY = "fmg-fuel-list-v1";

export type SavedList = { diet: PlanSettings["diet"]; items: ListItem[] };

function isItem(value: unknown): value is ListItem {
  if (value == null || typeof value !== "object") return false;
  const item = value as ListItem;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.quantity === "string"
    && typeof item.checked === "boolean" && (AISLES as readonly string[]).includes(item.aisle);
}

export function parseList(raw: string | null): SavedList | null {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<SavedList>) : null;
    if (!value || !Array.isArray(value.items)) return null;
    return { diet: value.diet === "vegetarian" ? "vegetarian" : "omnivore", items: value.items.filter(isItem) };
  } catch {
    return null;
  }
}

function read(): SavedList | null {
  try { return parseList(window.localStorage.getItem(LIST_KEY)); } catch { return null; }
}

function write(list: SavedList | null) {
  try {
    if (list) window.localStorage.setItem(LIST_KEY, JSON.stringify(list));
    else window.localStorage.removeItem(LIST_KEY);
  } catch { /* The list still works for this visit. */ }
}

export function useShoppingList() {
  const [list, setList] = useState<SavedList | null>(read);

  const save = useCallback((next: SavedList | null) => {
    setList(next);
    write(next);
  }, []);

  const update = useCallback((fn: (items: ListItem[]) => ListItem[]) => {
    setList((current) => {
      if (!current) return current;
      const next = { ...current, items: fn(current.items) };
      write(next);
      return next;
    });
  }, []);

  return {
    list,
    replace: (diet: PlanSettings["diet"], items: ListItem[]) => save({ diet, items }),
    toggle: (id: string) => update((items) => items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))),
    edit: (id: string, patch: Pick<ListItem, "name" | "quantity">) => update((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    remove: (id: string) => update((items) => items.filter((item) => item.id !== id)),
    add: (name: string, quantity: string, aisle: Aisle) => update((items) => [
      ...items,
      { id: `custom-${Date.now().toString(36)}-${items.length}`, name, quantity, aisle, checked: false, custom: true },
    ]),
    clear: () => save(null),
  };
}
