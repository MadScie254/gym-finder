// Demo basket and demo orders, kept in localStorage behind one small typed store.
// Nothing here talks to a network. A demo order is a record on this device only.
import { useSyncExternalStore } from "react";
import type { DemoItem, DemoStore } from "./types";

export type BasketLine = { itemId: string; qty: number };
export type Basket = { storeId: string; lines: BasketLine[] };
export type DemoOrderLine = { itemId: string; name: string; unit: string; qty: number; priceKes: number };
export type DemoOrder = {
  id: string;
  storeId: string;
  storeName: string;
  placedAt: string;
  lines: DemoOrderLine[];
  totalKes: number;
};
export type FuelState = { basket: Basket | null; orders: DemoOrder[] };

export const FUEL_STORAGE_KEY = "fmg-fuel-demo-v1";
const MAX_QTY = 20;

type KeyValue = Pick<Storage, "getItem" | "setItem">;

const isObject = (value: unknown): value is Record<string, unknown> => value != null && typeof value === "object" && !Array.isArray(value);

function parseLine(value: unknown): BasketLine | null {
  if (!isObject(value) || typeof value.itemId !== "string" || !Number.isInteger(value.qty)) return null;
  const qty = Math.min(MAX_QTY, Math.max(1, value.qty as number));
  return { itemId: value.itemId, qty };
}

function parseOrder(value: unknown): DemoOrder | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.storeId !== "string"
    || typeof value.storeName !== "string" || typeof value.placedAt !== "string"
    || typeof value.totalKes !== "number" || !Array.isArray(value.lines)) return null;
  const lines = value.lines.filter((line): line is DemoOrderLine => isObject(line)
    && typeof line.itemId === "string" && typeof line.name === "string" && typeof line.unit === "string"
    && typeof line.qty === "number" && typeof line.priceKes === "number");
  return { id: value.id, storeId: value.storeId, storeName: value.storeName, placedAt: value.placedAt, totalKes: value.totalKes, lines };
}

export function parseState(raw: string | null): FuelState {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!isObject(value)) return { basket: null, orders: [] };
    let basket: Basket | null = null;
    if (isObject(value.basket) && typeof value.basket.storeId === "string" && Array.isArray(value.basket.lines)) {
      const lines = value.basket.lines.map(parseLine).filter((line): line is BasketLine => line != null);
      basket = lines.length ? { storeId: value.basket.storeId, lines } : null;
    }
    const orders = Array.isArray(value.orders) ? value.orders.map(parseOrder).filter((o): o is DemoOrder => o != null) : [];
    return { basket, orders };
  } catch {
    return { basket: null, orders: [] };
  }
}

export function basketCount(basket: Basket | null): number {
  return basket?.lines.reduce((sum, line) => sum + line.qty, 0) ?? 0;
}

/** Resolve lines against the store's sample menu. Lines whose item no longer exists are dropped. */
export function basketLines(basket: Basket | null, store: DemoStore | undefined): Array<{ item: DemoItem; qty: number }> {
  if (!basket || !store || store.id !== basket.storeId) return [];
  return basket.lines.flatMap((line) => {
    const item = store.items.find((candidate) => candidate.id === line.itemId);
    return item ? [{ item, qty: line.qty }] : [];
  });
}

export function sampleTotal(lines: Array<{ item: DemoItem; qty: number }>): number {
  return lines.reduce((sum, line) => sum + line.item.priceKes * line.qty, 0);
}

export type AddResult = "added" | "other-store";

export function createFuelStore(storage: KeyValue | null, key = FUEL_STORAGE_KEY) {
  let state = parseState(safeGet(storage, key));
  const listeners = new Set<() => void>();

  function commit(next: FuelState) {
    state = next;
    try { storage?.setItem(key, JSON.stringify(next)); } catch { /* Storage full or off: keep it in memory. */ }
    listeners.forEach((listener) => listener());
  }

  function withLines(lines: BasketLine[], storeId: string): Basket | null {
    return lines.length ? { storeId, lines } : null;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Reload from storage, for example after another tab changed it. */
    refresh() {
      state = parseState(safeGet(storage, key));
      listeners.forEach((listener) => listener());
    },
    add(store: DemoStore, item: DemoItem): AddResult {
      const basket = state.basket;
      if (basket && basket.storeId !== store.id) return "other-store";
      const lines = basket?.lines ?? [];
      const found = lines.find((line) => line.itemId === item.id);
      const next = found
        ? lines.map((line) => (line === found ? { ...line, qty: Math.min(MAX_QTY, line.qty + 1) } : line))
        : [...lines, { itemId: item.id, qty: 1 }];
      commit({ ...state, basket: { storeId: store.id, lines: next } });
      return "added";
    },
    /** Empty the basket, then add this item. Used after the user agrees to switch stores. */
    replaceWith(store: DemoStore, item: DemoItem) {
      commit({ ...state, basket: { storeId: store.id, lines: [{ itemId: item.id, qty: 1 }] } });
    },
    setQty(itemId: string, qty: number) {
      const basket = state.basket;
      if (!basket) return;
      const lines = qty <= 0
        ? basket.lines.filter((line) => line.itemId !== itemId)
        : basket.lines.map((line) => (line.itemId === itemId ? { ...line, qty: Math.min(MAX_QTY, Math.round(qty)) } : line));
      commit({ ...state, basket: withLines(lines, basket.storeId) });
    },
    clearBasket() {
      commit({ ...state, basket: null });
    },
    /** Save the basket as a demo order on this device and empty it. Sends nothing anywhere. */
    placeDemoOrder(store: DemoStore, now = new Date(), id = `demo-${now.getTime().toString(36)}`): DemoOrder | null {
      const lines = basketLines(state.basket, store);
      if (!lines.length) return null;
      const order: DemoOrder = {
        id,
        storeId: store.id,
        storeName: store.name,
        placedAt: now.toISOString(),
        lines: lines.map(({ item, qty }) => ({ itemId: item.id, name: item.name, unit: item.unit, qty, priceKes: item.priceKes })),
        totalKes: sampleTotal(lines),
      };
      commit({ basket: null, orders: [order, ...state.orders] });
      return order;
    },
    deleteOrder(id: string) {
      commit({ ...state, orders: state.orders.filter((order) => order.id !== id) });
    },
    deleteAllOrders() {
      commit({ ...state, orders: [] });
    },
  };
}

export type FuelStore = ReturnType<typeof createFuelStore>;

function safeGet(storage: KeyValue | null, key: string): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

function browserStorage(): KeyValue | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

let shared: FuelStore | null = null;

export function fuelStore(): FuelStore {
  if (!shared) {
    shared = createFuelStore(browserStorage());
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => { if (event.key === FUEL_STORAGE_KEY) shared?.refresh(); });
    }
  }
  return shared;
}

/** For tests: start from what is in storage now. */
export function resetFuelStore(): void {
  shared = null;
}

export function useFuelState(): FuelState {
  const store = fuelStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
