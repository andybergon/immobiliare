import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import type { DB, Listing, Snapshot, Zone } from "./types.js";

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

  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const zone = await this.getZoneById(snapshot.zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${snapshot.zoneId}`);
    }

    const path = this.getListingPath(zone, snapshot.source);
    await this.ensureDir(dirname(path));
    await writeFile(path, JSON.stringify(snapshot, null, 2));
  }

  async getSnapshots(zoneId: string): Promise<Snapshot[]> {
    const snapshots: Snapshot[] = [];

    // Try hierarchical path first
    const zone = await this.getZoneById(zoneId);
    if (zone) {
      for (const source of ["immobiliare", "idealista"] as const) {
        const path = this.getListingPath(zone, source);
        if (existsSync(path)) {
          try {
            const content = await readFile(path, "utf-8");
            snapshots.push(JSON.parse(content));
          } catch {
            // Skip invalid files
          }
        }
      }
    }

    // Also check legacy flat structure for backwards compatibility
    const legacyDir = join(this.dataDir, "snapshots");
    if (existsSync(legacyDir)) {
      try {
        const dateDirs = await readdir(legacyDir);
        for (const dateDir of dateDirs) {
          const dirPath = join(legacyDir, dateDir);
          try {
            const files = await readdir(dirPath);
            for (const file of files) {
              if (file.startsWith(zoneId) && file.endsWith(".json")) {
                const content = await readFile(join(dirPath, file), "utf-8");
                snapshots.push(JSON.parse(content));
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Legacy dir doesn't exist or not readable
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

  async getListings(zoneId: string): Promise<Listing[]> {
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
      return true;
    });
  }

  async getRandomListing(zoneId: string): Promise<Listing | null> {
    const listings = await this.getListings(zoneId);
    if (listings.length === 0) return null;
    const idx = Math.floor(Math.random() * listings.length);
    return listings[idx];
  }

  async getRandomListings(zoneId: string, count: number): Promise<Listing[]> {
    const listings = await this.getListings(zoneId);
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
