import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import type { DB, Listing, Snapshot, Zone, CompactListing, CompactSnapshot } from "./types.js";

export interface LocalDBOptions {
  dataDir: string;
}

/**
 * LocalDB stores data in a hierarchical structure:
 *
 * data/
 * ├── zones.json                           # Zone definitions
 * └── listings/                            # Listing data
 *     └── {region}/                        # e.g., lazio
 *         └── {city}/                      # e.g., roma
 *             └── {area}/                  # e.g., litorale
 *                 └── {slug}/              # e.g., axa
 *                     └── immobiliare.json # Source-specific listings
 */
export class LocalDB implements DB {
  private dataDir: string;
  private listingsDir: string;
  private zonesFile: string;
  private zonesCache: Zone[] | null = null;

  constructor(options: LocalDBOptions) {
    this.dataDir = options.dataDir;
    this.listingsDir = join(this.dataDir, "listings");
    this.zonesFile = join(this.dataDir, "zones.json");
  }

  /**
   * Hydrate a compact listing into a full listing
   */
  private hydrateListing(
    compact: CompactListing,
    source: "immobiliare" | "idealista",
    zone: Zone,
    scrapedAt: string
  ): Listing {
    const sourceId = compact.sourceId;
    return {
      id: `${source}-${sourceId}`,
      source,
      sourceId,
      title: compact.title,
      price: compact.price,
      priceFormatted: `€ ${compact.price.toLocaleString("it-IT")}`,
      previousPrice: compact.previousPrice,
      images: compact.images,
      location: {
        region: zone.region,
        province: zone.city === "roma" ? "Roma" : zone.city,
        city: zone.city,
        zone: zone.name,
        zoneId: zone.id,
      },
      features: compact.features,
      url: source === "immobiliare"
        ? `https://www.immobiliare.it/annunci/${sourceId}/`
        : `https://www.idealista.it/immobile/${sourceId}/`,
      scrapedAt,
    };
  }

  /**
   * Convert a compact snapshot to a full snapshot
   */
  private hydrateSnapshot(compact: CompactSnapshot, zone: Zone): Snapshot {
    return {
      ...compact,
      listings: compact.listings.map((l) =>
        this.hydrateListing(l, compact.source, zone, compact.scrapedAt)
      ),
    };
  }

  /**
   * Check if a listing is in compact format (missing full fields)
   */
  private isCompactListing(listing: unknown): listing is CompactListing {
    const l = listing as Record<string, unknown>;
    return l.sourceId !== undefined && l.id === undefined && l.url === undefined;
  }

  private async ensureDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  private async loadZonesCache(): Promise<Zone[]> {
    if (this.zonesCache) return this.zonesCache;

    if (!existsSync(this.zonesFile)) {
      return [];
    }
    const content = await readFile(this.zonesFile, "utf-8");
    const data = JSON.parse(content);
    this.zonesCache = data.zones || data;
    return this.zonesCache!;
  }

  private async getZoneById(zoneId: string): Promise<Zone | null> {
    const zones = await this.loadZonesCache();
    return zones.find((z) => z.id === zoneId) || null;
  }

  /**
   * Get hierarchical path for a zone's listings
   * Path: listings/{region}/{city}/{area}/{slug}/{source}.json
   */
  private getListingPath(zone: Zone, source: string): string {
    return join(
      this.listingsDir,
      zone.region,
      zone.city,
      zone.area,
      zone.slug,
      `${source}.json`
    );
  }

  /**
   * Get hierarchical path from zone ID (async - needs zone lookup)
   */
  private async getListingPathById(zoneId: string, source: string): Promise<string | null> {
    const zone = await this.getZoneById(zoneId);
    if (!zone) return null;
    return this.getListingPath(zone, source);
  }

  /**
   * Compact a full listing for storage
   */
  private compactListing(listing: Listing): CompactListing {
    return {
      sourceId: listing.sourceId,
      title: listing.title,
      price: listing.price,
      ...(listing.previousPrice && { previousPrice: listing.previousPrice }),
      images: listing.images,
      features: listing.features,
    };
  }

  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const zone = await this.getZoneById(snapshot.zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${snapshot.zoneId}`);
    }

    // Save in compact format
    const compact: CompactSnapshot = {
      zoneId: snapshot.zoneId,
      scrapedAt: snapshot.scrapedAt,
      source: snapshot.source,
      listingCount: snapshot.listingCount,
      listings: snapshot.listings.map((l) => this.compactListing(l)),
      metadata: snapshot.metadata,
    };

    const path = this.getListingPath(zone, snapshot.source);
    await this.ensureDir(dirname(path));
    await writeFile(path, JSON.stringify(compact, null, 2));
  }

  async getSnapshots(zoneId: string): Promise<Snapshot[]> {
    const snapshots: Snapshot[] = [];

    const zone = await this.getZoneById(zoneId);
    if (zone) {
      for (const source of ["immobiliare", "idealista"] as const) {
        const path = this.getListingPath(zone, source);
        if (existsSync(path)) {
          try {
            const content = await readFile(path, "utf-8");
            const parsed = JSON.parse(content);
            // Hydrate if compact format
            if (parsed.listings?.length > 0 && this.isCompactListing(parsed.listings[0])) {
              snapshots.push(this.hydrateSnapshot(parsed as CompactSnapshot, zone));
            } else {
              snapshots.push(parsed);
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    }

    return snapshots.sort(
      (a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
    );
  }

  async getLatestSnapshot(
    zoneId: string,
    source?: "immobiliare" | "idealista"
  ): Promise<Snapshot | null> {
    const snapshots = await this.getSnapshots(zoneId);
    const filtered = source ? snapshots.filter((s) => s.source === source) : snapshots;
    return filtered[0] || null;
  }

  async getListings(zoneId: string, options?: { playableOnly?: boolean }): Promise<Listing[]> {
    const immobiliare = await this.getLatestSnapshot(zoneId, "immobiliare");
    const idealista = await this.getLatestSnapshot(zoneId, "idealista");

    const listings: Listing[] = [];
    if (immobiliare) listings.push(...immobiliare.listings);
    if (idealista) listings.push(...idealista.listings);

    const seen = new Set<string>();
    return listings.filter((l) => {
      const key = `${l.source}-${l.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (options?.playableOnly && l.price === 0) return false;
      return true;
    });
  }

  async getRandomListing(zoneId: string): Promise<Listing | null> {
    const listings = await this.getListings(zoneId, { playableOnly: true });
    if (listings.length === 0) return null;
    const idx = Math.floor(Math.random() * listings.length);
    return listings[idx];
  }

  async getRandomListings(zoneId: string, count: number): Promise<Listing[]> {
    const listings = await this.getListings(zoneId, { playableOnly: true });
    const shuffled = [...listings].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  async getZones(area?: string): Promise<Zone[]> {
    const zones = await this.loadZonesCache();
    return area ? zones.filter((z) => z.area === area) : zones;
  }

  async getZone(zoneId: string): Promise<Zone | null> {
    return this.getZoneById(zoneId);
  }

  async saveZones(zones: Zone[]): Promise<void> {
    // Zone saving is no longer supported - zones.json is the source of truth
    console.warn("saveZones is deprecated - edit data/zones.json directly");
  }

  async getExistingListings(zoneId: string): Promise<Map<string, Listing>> {
    const listings = new Map<string, Listing>();
    const snapshots = await this.getSnapshots(zoneId);
    for (const snapshot of snapshots) {
      for (const listing of snapshot.listings) {
        if (!listings.has(listing.sourceId)) {
          listings.set(listing.sourceId, listing);
        }
      }
    }
    return listings;
  }

  private hasListingChanged(existing: Listing, updated: Listing): boolean {
    if (existing.price !== updated.price) return true;
    if (existing.features?.area !== updated.features?.area) return true;
    if (existing.features?.rooms !== updated.features?.rooms) return true;
    if (existing.features?.bedrooms !== updated.features?.bedrooms) return true;
    if (existing.features?.bathrooms !== updated.features?.bathrooms) return true;
    if (existing.images?.length !== updated.images?.length) return true;
    return false;
  }

  async saveSnapshotDeduped(snapshot: Snapshot): Promise<{ added: number; updated: number; unchanged: number }> {
    const existing = await this.getExistingListings(snapshot.zoneId);
    const toSave: Listing[] = [];
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const listing of snapshot.listings) {
      const existingListing = existing.get(listing.sourceId);
      if (!existingListing) {
        toSave.push(listing);
        added++;
      } else if (this.hasListingChanged(existingListing, listing)) {
        toSave.push({ ...listing, previousPrice: existingListing.price });
        updated++;
      } else {
        // Keep existing listing as-is
        toSave.push(existingListing);
        unchanged++;
      }
    }

    // Always save to update the full merged listing set
    const mergedSnapshot: Snapshot = {
      ...snapshot,
      listings: toSave,
      listingCount: toSave.length,
    };

    await this.saveSnapshot(mergedSnapshot);
    return { added, updated, unchanged };
  }
}
