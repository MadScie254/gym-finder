export type LatLng = {
  lat: number;
  lng: number;
};

export type County = {
  name: string;
  lat: number;
  lng: number;
};

export type TrustTier = "verified" | "corroborated" | "listed" | "unconfirmed";

export type VenueKind =
  | "gym"
  | "crossfit"
  | "yoga"
  | "pilates"
  | "martial_arts"
  | "boxing"
  | "gymnastics"
  | "boot_camp";

export type AmenityKey =
  | "weights"
  | "classes"
  | "pool"
  | "sauna"
  | "showers"
  | "parking"
  | "wheelchair"
  | "women_only";

export type VenuePrice = {
  amount: number;
  currency: "KES";
  period: "day" | "month";
  /** The price as written on the source page. */
  text: string;
  /** Date read from a page showing current content; null when the page is undated or looks old. */
  asOf: string | null;
  note?: string;
  sourceUrl: string;
};

export type Venue = {
  id: string;
  slug: string;
  aliases: string[];
  name: string;
  kind: VenueKind;
  lat: number;
  lng: number;
  area: string | null;
  town: string | null;
  county: string | null;
  address: string | null;
  phones: string[];
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  /** `raw` is OSM opening_hours when it parses; `text` is the wording copied from the gym's own site. */
  hours: { raw: string; source: "osm" | "override"; text?: string } | null;
  fee: "free" | null;
  amenities: Partial<Record<AmenityKey, true>>;
  /** Only from a verified override; amounts exactly as the gym's site states them. */
  prices?: Partial<Record<"dayPass" | "monthly", VenuePrice>>;
  /** Present when a person checked the venue; `method` says how, so the UI never implies a visit. */
  verification?: {
    method: "website" | "phone" | "visit";
    checkedAt: string;
    evidence: Record<string, { url: string; quote: string }>;
  };
  trust: {
    tier: TrustTier;
    score: number;
    reasons: string[];
    sources: string[];
    lastSeen: string | null;
    stale: boolean;
    verifiedAt: string | null;
  };
  provenance: Record<string, string>;
  osmUrl: string | null;
};

export type DataManifest = {
  builtAt: string;
  overtureRelease: string | null;
  osmSnapshotAt: string | null;
  osmStale: boolean;
  counts: {
    total: number;
    defaultVisible: number;
    byTier: Record<TrustTier, number>;
    byCounty: Record<string, number>;
    byKind: Record<string, number>;
  };
  licenses: string[];
  notices: string[];
  gymsPath: string;
};

export type PlaceHit = {
  id: string;
  name: string;
  subtitle: string;
  kind: "county" | "town" | "suburb" | "area" | "place" | "landmark";
  location: LatLng;
};
