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

export type Venue = {
  id: string;
  slug: string;
  aliases: string[];
  name: string;
  /** The source's own spelling, present only when cleaning changed the name. */
  nameRaw?: string;
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
  hours: { raw: string; source: "osm" | "override" | "web" } | null;
  fee: "free" | null;
  amenities: Partial<Record<AmenityKey, true>>;
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
  osmStaleReason?: string;
  /** Date of the web-research file used in this build; null when there was none. */
  researchAt?: string | null;
  counts: {
    total: number;
    defaultVisible: number;
    /** Default-visible venues with a phone, website or WhatsApp-able mobile. */
    withContact?: number;
    withPhone?: number;
    byTier: Record<TrustTier, number>;
    byCounty: Record<string, number>;
    visibleByCounty?: Record<string, number>;
    byKind: Record<string, number>;
    bySource?: Record<string, number>;
    landmarks?: Record<string, number>;
  };
  /** The last different published build, for the "not >15% below" gate. */
  previous?: { builtAt: string | null; gymsPath: string | null; total: number; defaultVisible: number } | null;
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
