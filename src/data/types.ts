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
  hours: { raw: string; source: "osm" | "override" } | null;
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
