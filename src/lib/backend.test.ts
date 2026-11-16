import { describe, expect, it } from "vitest";
import { createLocalBackend } from "./backend";
import { reportMessage, supportNumber, supportWhatsAppHref } from "./report";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data };
}

describe("backend simulation", () => {
  it("stores a submission on this device with a local status", async () => {
    const storage = memoryStorage();
    const backend = createLocalBackend(storage, () => new Date("2026-11-11T10:00:00Z"));
    const row = await backend.submit({ kind: "wrong_details", venueId: "gers:1", venueName: " Salute Gym ", message: "Phone is wrong" });
    expect(row).toMatchObject({ status: "local", venueName: "Salute Gym", createdAt: "2026-11-11T10:00:00.000Z" });
    expect(row.id).toMatch(/^local-/);
    expect(await createLocalBackend(storage).list()).toEqual([row]);
  });

  it("lists newest first and deletes by id", async () => {
    let clock = 0;
    const backend = createLocalBackend(memoryStorage(), () => new Date(Date.UTC(2026, 10, 11, 10, clock++)));
    const first = await backend.submit({ kind: "add_gym", venueId: null, venueName: "Iron Den", message: "", place: "Kondele" });
    const second = await backend.submit({ kind: "claim", venueId: "gers:2", venueName: "Dojo", message: "I am the manager" });
    expect((await backend.list()).map((row) => row.id)).toEqual([second.id, first.id]);
    await backend.remove(second.id);
    expect((await backend.list()).map((row) => row.id)).toEqual([first.id]);
  });

  it("still completes when storage throws (private mode)", async () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const backend = createLocalBackend(broken);
    const row = await backend.submit({ kind: "other", venueId: null, venueName: "Gym", message: "Hello" });
    expect(row.status).toBe("local");
  });

  it("ignores rows it did not write", async () => {
    const storage = memoryStorage();
    storage.setItem("fmg-submissions-v1", JSON.stringify([{ nope: true }, "x"]));
    expect(await createLocalBackend(storage).list()).toEqual([]);
  });
});

describe("support WhatsApp", () => {
  it("builds a wa.me link only when a number is configured", () => {
    expect(supportWhatsAppHref("Hi", undefined)).toBeNull();
    expect(supportWhatsAppHref("Hi", "")).toBeNull();
    expect(supportWhatsAppHref("Hi there", "+254 700 000 000")).toBe("https://wa.me/254700000000?text=Hi+there");
    expect(supportNumber("12")).toBeNull();
  });

  it("writes the report out in English with the gym link on the current host", () => {
    const text = reportMessage(
      { id: "local-1", kind: "claim", venueId: "gers:2", venueName: "Dojo", message: "Manager here", contact: "0700000000" },
      { slug: "dojo-6c95" } as never,
      "https://preview.example",
    );
    expect(text).toContain("Claim: I run this gym");
    expect(text).toContain("https://preview.example/gym/dojo-6c95");
    expect(text).toContain("Reply to: 0700000000");
    expect(text).not.toContain("findmygym.ke");
  });
});
