import demoFile from "@data/fuel/demo-stores.json";
import type { DemoItem, DemoStore, DemoStoreFile } from "./types";

/** "demo" (the default) runs the simulation. "live" shows only configured live services, of which there are none yet. */
export type FuelMode = "demo" | "live";

export function fuelMode(env: { VITE_FUEL_MODE?: string } = import.meta.env): FuelMode {
  return env.VITE_FUEL_MODE === "live" ? "live" : "demo";
}

export const DEMO_STORES: DemoStore[] = (demoFile as DemoStoreFile).stores;

export const DEMO_TOWNS: string[] = [...new Set(DEMO_STORES.map((store) => store.town))];

export function findStore(id: string | undefined): DemoStore | undefined {
  return DEMO_STORES.find((store) => store.id === id);
}

export function findItem(store: DemoStore, itemId: string): DemoItem | undefined {
  return store.items.find((item) => item.id === itemId);
}

/** Real services, shown only as plain links to their public homepage. Checked 2026-11-11 (HTTP 200). */
export const REAL_SERVICES = [
  { id: "glovo", name: "Glovo", url: "https://glovoapp.com/en/ke" },
  { id: "foodplus", name: "Chandarana Foodplus", url: "https://foodplus.co.ke/" },
] as const;
