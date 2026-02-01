import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import type { DB, Listing, Snapshot, Zone } from "./types.js";

export interface LocalDBOptions {
  dataDir: string;
}

export class LocalDB implements DB {
  private dataDir: string;
  private snapshotsDir: string;
  private zonesFile: string;

  constructor(options: LocalDBOptions) {
    this.dataDir = options.dataDir;
    this.snapshotsDir = join(this.dataDir, "snapshots");
    this.zonesFile = join(this.dataDir, "zones.json");
  }

  private async ensureDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  private getSnapshotPath(zoneId: string, source: string, date: string): string {
    const dateDir = date.split("T")[0];
    return join(this.snapshotsDir, dateDir, `${zoneId}-${source}.json`);
  }

  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const path = this.getSnapshotPath(snapshot.zoneId, snapshot.source, snapshot.scrapedAt);
    await this.ensureDir(dirname(path));
    await writeFile(path, JSON.stringify(snapshot, null, 2));
  }

  async getSnapshots(zoneId: string): Promise<Snapshot[]> {
    const snapshots: Snapshot[] = [];

    if (!existsSync(this.snapshotsDir)) {
      return snapshots;
    }

    const dateDirs = await readdir(this.snapshotsDir);

    for (const dateDir of dateDirs) {
      const dirPath = join(this.snapshotsDir, dateDir);
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

  async getZones(region?: string): Promise<Zone[]> {
    if (!existsSync(this.zonesFile)) {
      return [];
    }
    const content = await readFile(this.zonesFile, "utf-8");
    const zones: Zone[] = JSON.parse(content);
    return region ? zones.filter((z) => z.region === region) : zones;
  }

  async getZone(zoneId: string): Promise<Zone | null> {
    const zones = await this.getZones();
    return zones.find((z) => z.id === zoneId) || null;
  }

  async saveZones(zones: Zone[]): Promise<void> {
    await this.ensureDir(this.dataDir);
    const existing = await this.getZones();
    const merged = [...existing];

    for (const zone of zones) {
      const idx = merged.findIndex((z) => z.id === zone.id);
      if (idx >= 0) {
        merged[idx] = zone;
      } else {
        merged.push(zone);
      }
    }

    await writeFile(this.zonesFile, JSON.stringify(merged, null, 2));
  }
}
