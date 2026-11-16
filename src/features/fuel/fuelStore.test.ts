import { describe, expect, it, vi } from "vitest";
import { DEMO_STORES } from "./data";
import { basketCount, basketLines, createFuelStore, parseState, sampleTotal } from "./fuelStore";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, data };
}

const [first, second] = DEMO_STORES;

describe("demo basket", () => {
  it("adds, increments and totals sample prices", () => {
    const store = createFuelStore(memory());
    expect(store.add(first, first.items[0])).toBe("added");
    store.add(first, first.items[0]);
    store.add(first, first.items[1]);
    const lines = basketLines(store.getState().basket, first);
    expect(lines.map((l) => l.qty)).toEqual([2, 1]);
    expect(basketCount(store.getState().basket)).toBe(3);
    expect(sampleTotal(lines)).toBe(first.items[0].priceKes * 2 + first.items[1].priceKes);
  });

  it("keeps one store per basket and replaces only when asked", () => {
    const store = createFuelStore(memory());
    store.add(first, first.items[0]);
    expect(store.add(second, second.items[0])).toBe("other-store");
    expect(store.getState().basket?.storeId).toBe(first.id);
    store.replaceWith(second, second.items[0]);
    expect(store.getState().basket).toEqual({ storeId: second.id, lines: [{ itemId: second.items[0].id, qty: 1 }] });
  });

  it("changes quantity and removes a line at zero", () => {
    const store = createFuelStore(memory());
    store.add(first, first.items[0]);
    store.setQty(first.items[0].id, 4);
    expect(store.getState().basket?.lines[0].qty).toBe(4);
    store.setQty(first.items[0].id, 0);
    expect(store.getState().basket).toBeNull();
  });

  it("persists to storage and reads it back", () => {
    const storage = memory();
    const a = createFuelStore(storage);
    a.add(first, first.items[2]);
    const b = createFuelStore(storage);
    expect(b.getState().basket?.lines).toEqual([{ itemId: first.items[2].id, qty: 1 }]);
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    const store = createFuelStore(memory());
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.add(first, first.items[0]);
    off();
    store.clearBasket();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("demo orders", () => {
  it("saves the basket as a demo order, newest first, and empties the basket", () => {
    const store = createFuelStore(memory());
    store.add(first, first.items[0]);
    const one = store.placeDemoOrder(first, new Date("2026-11-16T17:00:00Z"), "one");
    store.add(first, first.items[1]);
    store.placeDemoOrder(first, new Date("2026-11-16T18:00:00Z"), "two");
    expect(one).toMatchObject({ id: "one", storeName: first.name, totalKes: first.items[0].priceKes });
    expect(store.getState().orders.map((o) => o.id)).toEqual(["two", "one"]);
    expect(store.getState().basket).toBeNull();
  });

  it("will not place an empty order", () => {
    const store = createFuelStore(memory());
    expect(store.placeDemoOrder(first)).toBeNull();
    expect(store.getState().orders).toEqual([]);
  });

  it("deletes one order or all of them", () => {
    const store = createFuelStore(memory());
    for (const id of ["a", "b", "c"]) {
      store.add(first, first.items[0]);
      store.placeDemoOrder(first, new Date(), id);
    }
    store.deleteOrder("b");
    expect(store.getState().orders.map((o) => o.id)).toEqual(["c", "a"]);
    store.deleteAllOrders();
    expect(store.getState().orders).toEqual([]);
  });
});

describe("stored data", () => {
  it("survives junk, bad shapes and storage that throws", () => {
    expect(parseState("{not json")).toEqual({ basket: null, orders: [] });
    expect(parseState(JSON.stringify({ basket: { storeId: 3 }, orders: [{ id: 1 }] }))).toEqual({ basket: null, orders: [] });
    expect(parseState(JSON.stringify({ basket: { storeId: "x", lines: [{ itemId: "y", qty: 99 }] } })).basket?.lines[0].qty).toBe(20);
    const throwing = { getItem: () => { throw new Error("off"); }, setItem: () => { throw new Error("off"); } };
    const store = createFuelStore(throwing);
    expect(store.add(first, first.items[0])).toBe("added");
    expect(basketCount(store.getState().basket)).toBe(1);
  });
});
