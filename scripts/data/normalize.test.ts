import { describe, expect, it } from "vitest";
import { cleanAddress, kindOf, normalizeOsm, normalizeOverture } from "./normalize.mjs";

const row = (over: Record<string, unknown> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Gym",
  tax: "gym",
  basic: "gym",
  confidence: 0.8,
  addr: "Marenga Rd",
  locality: "Nairobi",
  region: null,
  country: "KE",
  phones: ["+254733758380"],
  websites: ["http://www.example.co.ke/"],
  socials: ["https://www.facebook.com/1025090694275150"],
  sources: [
    { property: "", dataset: "meta", update_time: "2026-09-14T00:00:00.000Z" },
    { property: "/properties/confidence", dataset: "Overture", update_time: "2026-09-17T22:52:12Z" },
  ],
  lng: 36.8143,
  lat: -1.2889,
  ...over,
});
const record = (over: Record<string, unknown> = {}) => {
  const result = normalizeOverture(row(over));
  if (!result.record) throw new Error(`expected a record, got ${JSON.stringify(result)}`);
  return result.record;
};

describe("Overture filter", () => {
  it("requires country KE and a point inside the Kenya polygon", () => {
    expect(normalizeOverture(row({ country: "TZ" }))).toEqual({ skip: "country" });
    expect(normalizeOverture(row({ country: null }))).toEqual({ skip: "country" });
    expect(normalizeOverture(row({ lat: -6.8, lng: 39.2 }))).toEqual({ skip: "polygon" }); // Dar es Salaam, labelled KE
    expect(normalizeOverture(row({ name: "  " }))).toEqual({ skip: "no-name" });
  });

  it("keeps the brief's fitness taxonomy, and name-gated generic categories", () => {
    for (const tax of ["gym", "yoga_studio", "pilates_studio", "martial_arts_club", "boxing_class", "gymnastics_center", "boot_camp"]) {
      expect(normalizeOverture(row({ tax, basic: null, name: "Plain Name" })).record).toBeTruthy();
    }
    expect(normalizeOverture(row({ tax: "sports_and_recreation", basic: "sports_and_recreation", name: "VMX Fitness" })).record).toBeTruthy();
    expect(normalizeOverture(row({ tax: null, basic: null, name: "Skymax Gym & Fitness Centre" })).record).toBeTruthy();
    expect(normalizeOverture(row({ tax: "fitness_trainer", basic: "sport_or_fitness_facility", name: "Jeff's Fitness Centre" })).record).toBeTruthy();
    expect(normalizeOverture(row({ tax: "swimming_pool", basic: null, name: "Sache fitness" })).record).toBeTruthy();
  });

  it("logs, not drops silently, a row in an unrelated category or a generic one without a fitness word", () => {
    const shop = normalizeOverture(row({ tax: "warehouse_club_store", basic: "warehouse_club_store", name: "Fitness Hub" }));
    expect(shop.hit).toMatchObject({ rule: "category:warehouse_club_store", name: "Fitness Hub" });
    const plain = normalizeOverture(row({ tax: "sports_and_recreation", basic: "sports_and_recreation", name: "Lion Arena" }));
    expect(plain.hit?.rule).toBe("category:sports_and_recreation");
    expect(normalizeOverture(row({ tax: "sport_or_fitness_facility", basic: null, name: "Mikmos Centre" })).hit).toBeTruthy();
  });

  it("never uses operating_status", () => {
    expect(normalizeOverture(row({ operating_status: "closed" })).record).toBeTruthy();
  });
});

describe("Overture normalisation", () => {
  it("cleans the name and keeps the source name as nameRaw", () => {
    const r = record({ name: "Stardom_Gym" });
    expect(r.name).toBe("Stardom Gym");
    expect(r.nameRaw).toBe("Stardom_Gym");
    expect(record({ name: "ROYS GYM" }).name).toBe("Roys Gym");
  });

  it("address is null when unknown and never Kenya", () => {
    for (const bad of ["Kenya", "kenya", " KENYA ", "Nairobi", "nairobi", "Nairobi, Kenya", "", null, "N/A"]) {
      expect(cleanAddress(bad)).toBeNull();
    }
    expect(record({ addr: "Kenya" }).address).toBeNull();
    expect(record({ addr: "Marenga Rd" }).address).toBe("Marenga Rd");
    expect(cleanAddress("Westlands, Nairobi, Kenya")).toBe("Westlands, Nairobi, Kenya");
  });

  it("separates the website from social pages and never mislabels", () => {
    const r = record({
      websites: ["http://www.example.co.ke/?utm_source=x", "https://www.instagram.com/examplegym/", ""],
      socials: ["https://www.facebook.com/1025090694275150", "https://www.twitter.com/examplegym", "https://linktr.ee/example"],
    });
    expect(r.website).toBe("http://www.example.co.ke/");
    expect(r.instagram).toBe("https://www.instagram.com/examplegym/");
    expect(r.facebook).toBe("https://www.facebook.com/1025090694275150");
    expect(record({ websites: ["https://www.facebook.com/examplegym"], socials: null }).website).toBeNull();
    expect(record({ websites: ["https://youtu.be/abc"], socials: [] }).website).toBeNull();
  });

  it("normalises phones to E.164, drops foreign numbers, and guesses WhatsApp only from a mobile", () => {
    const r = record({ phones: ["0733 758380", "+255712345678", "020 2223344"] });
    expect(r.phones).toEqual(["+254733758380", "+254202223344"]);
    expect(r.droppedPhones).toEqual(["+255712345678"]);
    expect(r.whatsapp).toBe("+254733758380");
    expect(record({ phones: ["020 2223344"] }).whatsapp).toBeNull();
  });

  it("lastSeen ignores Overture's own confidence-calculation stamp", () => {
    const r = record();
    expect(r.lastSeen).toBe("2026-09-14");
    expect(r.overtureDatasets).toEqual(["meta"]);
    expect(r.provenance.phone).toBe("overture:meta");
  });

  it("assigns county from the source county name when it is plausible, else nearest centroid", () => {
    // Ongata Rongai: the nearest county centroid is Nairobi, but it is in Kajiado.
    expect(record({ lat: -1.396, lng: 36.76, locality: "Kajiado" }).county).toBe("Kajiado");
    expect(record({ lat: -1.396, lng: 36.76, locality: "Ruiru" }).countyBy).toBe("centroid");
    // A county name that is hundreds of km away is distrusted.
    expect(record({ locality: "Turkana" }).county).toBe("Nairobi");
  });

  it("area and town come from places, never from Overture locality", () => {
    const r = record({ lat: -1.29797, lng: 36.78809, locality: "Kajiado" });
    expect(r.area).toBe("Kilimani");
    expect(r.town).toBe("Nairobi");
  });

  it("refines a generic gym by name but keeps a specific taxonomy", () => {
    expect(kindOf("Black Heroes Taekwondo Academy", "gym")).toBe("martial_arts");
    expect(kindOf("CrossFit Kwetu", "gym")).toBe("crossfit");
    expect(kindOf("Sweat Hot Yoga", "gym")).toBe("yoga");
    expect(kindOf("Zen Corner", "yoga")).toBe("yoga");
    expect(kindOf("Plain Name", "gym")).toBe("gym");
    expect(kindOf("Climb Blue Sky", null, null)).toBe("gym");
  });
});

describe("OSM normalisation", () => {
  const osm = (tags: Record<string, string>, over: Record<string, unknown> = {}) => {
    const result = normalizeOsm({ id: "osm:node/5", osmType: "node", osmId: 5, name: tags.name ?? "EA Fitness", lat: -1.2921, lng: 36.7872, tags, ...over });
    if (!result.record) throw new Error("no record");
    return result.record;
  };

  it("reads phones (several per tag), WhatsApp, hours, fee, socials and the OSM URL", () => {
    const r = osm({
      phone: "+254 722 784664; 0733 758380",
      "contact:whatsapp": "+254 700 111222",
      opening_hours: "Mo-Sa 06:00-21:00",
      fee: "no",
      website: "https://ea.example.co.ke",
      "contact:instagram": "eafitness",
      "contact:facebook": "https://facebook.com/eafitness",
      "addr:housenumber": "12",
      "addr:street": "Ngong Rd",
      "addr:suburb": "Kilimani",
      check_date: "2026-03-02",
    });
    expect(r.phones).toEqual(["+254722784664", "+254733758380"]);
    expect(r.whatsapp).toBe("+254700111222");
    expect(r.whatsappSource).toBe("osm");
    expect(r.hours).toEqual({ raw: "Mo-Sa 06:00-21:00", source: "osm" });
    expect(r.fee).toBe("free");
    expect(r.website).toBe("https://ea.example.co.ke/");
    expect(r.instagram).toBe("https://www.instagram.com/eafitness/");
    expect(r.facebook).toBe("https://www.facebook.com/eafitness");
    expect(r.address).toBe("12 Ngong Rd, Kilimani");
    expect(r.lastSeen).toBe("2026-03-02");
    expect(r.osmUrl).toBe("https://www.openstreetmap.org/node/5");
    expect(r.provenance).toMatchObject({ name: "osm", location: "osm", phone: "osm", hours: "osm", whatsapp: "osm" });
  });

  it("has no date when OSM gives none (the snapshot time is not an update time)", () => {
    expect(osm({}).lastSeen).toBeNull();
    expect(osm({}).hours).toBeNull();
    expect(osm({}).address).toBeNull();
  });

  it("women_only only from an unambiguous tag", () => {
    expect(osm({ female: "yes" }).amenities).toEqual({});
    expect(osm({ female: "only" }).amenities).toEqual({ women_only: true });
    expect(osm({ female: "yes", male: "no" }).amenities).toEqual({ women_only: true });
    expect(osm({ wheelchair: "yes", shower: "yes", sauna: "yes" }).amenities).toEqual({ wheelchair: true, showers: true, sauna: true });
  });

  it("kind from the sport tag, then the name", () => {
    expect(osm({ sport: "yoga" }).kind).toBe("yoga");
    expect(osm({ sport: "boxing;fitness" }).kind).toBe("boxing");
    expect(osm({ name: "Nyali crossfit gym" }).kind).toBe("crossfit");
  });

  it("drops a point outside Kenya", () => {
    expect(normalizeOsm({ id: "osm:node/9", name: "Far", lat: 51.5, lng: -0.1, tags: {} })).toEqual({ skip: "polygon" });
  });
});
