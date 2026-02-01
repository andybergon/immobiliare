export interface ListingLocation {
  region: string;
  province: string;
  city: string;
  zone: string;
  zoneId: string;
  address?: string;
}

export interface ListingFeatures {
  area: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  elevator: boolean | null;
  energyClass: string | null;
  yearBuilt: number | null;
  condition: string | null;
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
  getRandomListing(zoneId: string): Promise<Listing | null>;
  getRandomListings(zoneId: string, count: number): Promise<Listing[]>;

  getZones(area?: string): Promise<Zone[]>;
  getZone(zoneId: string): Promise<Zone | null>;
  saveZones(zones: Zone[]): Promise<void>;
}
