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
  images: string[];
  location: ListingLocation;
  features: ListingFeatures;
  url: string;
  scrapedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  slug: string;
  region: string;
  province: string;
  city: string;
  immobiliareParams?: {
    idZona?: string;
    idQuartiere?: string;
  };
  idealistaParams?: {
    locationId?: string;
    locationUri?: string;
  };
}

export interface Snapshot {
  zoneId: string;
  scrapedAt: string;
  source: "immobiliare" | "idealista";
  listingCount: number;
  listings: Listing[];
}

export interface DB {
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  getSnapshots(zoneId: string): Promise<Snapshot[]>;
  getLatestSnapshot(zoneId: string, source?: "immobiliare" | "idealista"): Promise<Snapshot | null>;

  getListings(zoneId: string): Promise<Listing[]>;
  getRandomListing(zoneId: string): Promise<Listing | null>;
  getRandomListings(zoneId: string, count: number): Promise<Listing[]>;

  getZones(region?: string): Promise<Zone[]>;
  getZone(zoneId: string): Promise<Zone | null>;
  saveZones(zones: Zone[]): Promise<void>;
}
