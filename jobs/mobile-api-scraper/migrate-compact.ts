#!/usr/bin/env bun
/**
 * Migration script to compact existing listing data:
 * - Convert full image URLs to just image IDs
 * - Remove redundant fields (id, url, source, location, scrapedAt per listing, priceFormatted)
 *
 * Run with: bun run jobs/mobile-api-scraper/migrate-compact.ts
 * Add --dry-run to preview changes without saving
 */

import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { extractImageId } from "@ipg/db/client";
import type { CompactListing, CompactSnapshot, ListingFeatures } from "@ipg/db";

const DATA_DIR = join(import.meta.dir, "../../data/listings");

interface MigrationStats {
  filesProcessed: number;
  listingsProcessed: number;
  bytesBeforeTotal: number;
  bytesAfterTotal: number;
}

interface OldListing {
  id?: string;
  source?: string;
  sourceId: string;
  title: string;
  price: number;
  priceFormatted?: string;
  previousPrice?: number;
  images: string[];
  location?: unknown;
  features: ListingFeatures;
  url?: string;
  scrapedAt?: string;
}

interface OldSnapshot {
  zoneId: string;
  scrapedAt: string;
  source: "immobiliare" | "idealista";
  listingCount: number;
  listings: OldListing[];
  metadata?: {
    requestedLimit?: number;
    returnedCount?: number;
    hitLimit?: boolean;
  };
}

async function* walkJsonFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJsonFiles(path);
    } else if (entry.name.endsWith(".json")) {
      yield path;
    }
  }
}

function compactImage(img: string): string {
  if (/^\d+$/.test(img)) return img;
  const id = extractImageId(img);
  return id || img;
}

function compactListing(listing: OldListing): CompactListing {
  return {
    sourceId: listing.sourceId,
    title: listing.title,
    price: listing.price,
    ...(listing.previousPrice && { previousPrice: listing.previousPrice }),
    images: listing.images.map(compactImage),
    features: listing.features,
  };
}

async function migrate(dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    filesProcessed: 0,
    listingsProcessed: 0,
    bytesBeforeTotal: 0,
    bytesAfterTotal: 0,
  };

  console.log(`\nScanning ${DATA_DIR}...\n`);

  for await (const filePath of walkJsonFiles(DATA_DIR)) {
    const relativePath = filePath.replace(DATA_DIR + "/", "");
    const content = await readFile(filePath, "utf-8");
    const bytesBefore = Buffer.byteLength(content);
    stats.bytesBeforeTotal += bytesBefore;

    let oldSnapshot: OldSnapshot;
    try {
      oldSnapshot = JSON.parse(content);
    } catch {
      console.log(`  ⚠️ Skipping invalid JSON: ${relativePath}`);
      continue;
    }

    if (!oldSnapshot.listings || !Array.isArray(oldSnapshot.listings)) {
      console.log(`  ⚠️ No listings array in: ${relativePath}`);
      continue;
    }

    const compactedListings: CompactListing[] = [];
    for (const listing of oldSnapshot.listings) {
      compactedListings.push(compactListing(listing));
      stats.listingsProcessed++;
    }

    const compactedSnapshot: CompactSnapshot = {
      zoneId: oldSnapshot.zoneId,
      scrapedAt: oldSnapshot.scrapedAt,
      source: oldSnapshot.source,
      listingCount: compactedListings.length,
      listings: compactedListings,
      ...(oldSnapshot.metadata && { metadata: oldSnapshot.metadata }),
    };

    const newContent = JSON.stringify(compactedSnapshot, null, 2);
    const bytesAfter = Buffer.byteLength(newContent);
    stats.bytesAfterTotal += bytesAfter;
    stats.filesProcessed++;

    const saved = ((bytesBefore - bytesAfter) / 1024).toFixed(1);
    console.log(`${relativePath}: ${oldSnapshot.listings.length} listings, -${saved}KB`);

    if (!dryRun) {
      await writeFile(filePath, newContent);
    }
  }

  return stats;
}

const dryRun = process.argv.includes("--dry-run");

console.log(`\n${"=".repeat(60)}`);
console.log(`Data Compaction Migration${dryRun ? " (DRY RUN)" : ""}`);
console.log(`${"=".repeat(60)}`);
console.log(`\nRemoving redundant fields:`);
console.log(`  - id, url, source (reconstructible)`);
console.log(`  - location.* (from path + zones.json)`);
console.log(`  - priceFormatted (from price)`);
console.log(`  - scrapedAt per listing (snapshot level only)`);

const stats = await migrate(dryRun);

const savedMB = ((stats.bytesBeforeTotal - stats.bytesAfterTotal) / 1024 / 1024).toFixed(2);
const pctSaved = (
  ((stats.bytesBeforeTotal - stats.bytesAfterTotal) / stats.bytesBeforeTotal) *
  100
).toFixed(1);

console.log(`\n${"=".repeat(60)}`);
console.log(`Summary${dryRun ? " (DRY RUN - no files modified)" : ""}`);
console.log(`${"=".repeat(60)}`);
console.log(`  Files processed: ${stats.filesProcessed}`);
console.log(`  Listings processed: ${stats.listingsProcessed}`);
console.log(`  Size before: ${(stats.bytesBeforeTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Size after: ${(stats.bytesAfterTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Saved: ${savedMB} MB (${pctSaved}%)`);

if (dryRun) {
  console.log(`\nRun without --dry-run to apply changes.`);
}
