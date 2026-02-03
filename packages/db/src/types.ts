export interface ListingLocation {
  region: string;
  province: string;
  city: string;
  zone: string;
  zoneId: string;
  address?: string;
}

/** Compact listing format for storage (minimal fields) */
export interface CompactListing {
  sourceId: string;
  title: string;
  price: number;
  previousPrice?: number;
  images: string[];
  features: ListingFeatures;
}

/** Compact snapshot format for storage */
export interface CompactSnapshot {
  zoneId: string;
  scrapedAt: string;
  source: "immobiliare" | "idealista";
  listingCount: number;
  listings: CompactListing[];
  metadata?: SnapshotMetadata;
}

export interface ListingFeatures {
  area: number | null;
  rooms: number | null;
  roomsRaw: string | null;
  bedrooms: number | null;
  bedroomsRaw: string | null;
  bathrooms: number | null;
  bathroomsRaw: string | null;
  floor: number | null;
  floorRaw: string | null;
  totalFloors: number | null;
  elevator: boolean | null;
  energyClass: string | null;
  yearBuilt: number | null;
  condition: string | null;
  typology: string | null;
  heating: string | null;
  balcony: boolean | null;
  terrace: boolean | null;
  furnished: boolean | null;
  cellar: boolean | null;
  luxury: boolean | null;
  airConditioning: boolean | null;
  parking: boolean | null;
  otherFeatures: string[] | null;
}

export interface Listing {
  id: string;
  source: "immobiliare" | "idealista";
  sourceId: string;
  title: string;
  description?: string;
  price: number;
  priceFormatted: string;
  previousPrice?: number;
  images: string[];
  location: ListingLocation;
  features: ListingFeatures;
  url: string;
  scrapedAt: string;
}

/**
 * Zone hierarchy: region > city > area > zone
 * Example: lazio > roma > litorale > axa
 *
 * Immobiliare.it zone hierarchy:
 * - pr: Province (e.g., "RM")
 * - c: City ID (e.g., 6737 for Roma)
 * - z2: Macrozone - broad areas grouping multiple neighborhoods (e.g., "Axa, Casal Palocco, Infernetto")
 * - z3: Microzone - granular neighborhoods (e.g., "Axa")
 */
export interface Zone {
  id: string;
  name: string;
  slug: string;
  region: string;
  city: string;
  area: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  /** Immobiliare.it macrozone ID (z2 parameter) - broad area grouping multiple neighborhoods */
  immobiliareZ2?: number;
  /** Immobiliare.it microzone ID (z3 parameter) - specific neighborhood */
  immobiliareZ3?: number;
}

export interface ZoneFilters {
  area?: string;
  region?: string;
  city?: string;
}

export interface SnapshotMetadata {
  requestedLimit?: number;
  returnedCount?: number;
  hitLimit?: boolean;
}

export interface Snapshot {
  zoneId: string;
  scrapedAt: string;
  source: "immobiliare" | "idealista";
  listingCount: number;
  listings: Listing[];
  metadata?: SnapshotMetadata;
}

export interface DB {
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  getSnapshots(zoneId: string): Promise<Snapshot[]>;
  getLatestSnapshot(zoneId: string, source?: "immobiliare" | "idealista"): Promise<Snapshot | null>;

  getListings(zoneId: string): Promise<Listing[]>;
  getListingCount(zoneId: string, options?: { playableOnly?: boolean; source?: Snapshot["source"] }): Promise<number>;
  getRandomListing(zoneId: string): Promise<Listing | null>;
  getRandomListings(zoneId: string, count: number): Promise<Listing[]>;

  /**
   * Get zones.
   *
   * Backwards compatible overload:
   * - string argument filters by `area`
   * - object argument supports filtering by `region`, `city`, and/or `area`
   */
  getZones(filter?: string | ZoneFilters): Promise<Zone[]>;
  getZone(zoneId: string): Promise<Zone | null>;
  saveZones(zones: Zone[]): Promise<void>;
}
