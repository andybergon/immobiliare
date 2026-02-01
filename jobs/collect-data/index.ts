import { LocalDB, type Snapshot } from "@ipg/db";
import { getZonesBySlug, getAllZones, getZonesByArea, getAreas } from "./zones.js";
import { scrapeWithApify, type ScrapeResult } from "./apify-scraper.js";
import { resolve } from "path";

// Load .env.local from project root if it exists
const envPath = resolve(import.meta.dirname, "../../.env.local");
if (await Bun.file(envPath).exists()) {
  const content = await Bun.file(envPath).text();
  for (const line of content.split("\n")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

interface CollectOptions {
  zones: string[];
  limit?: number;
  dryRun?: boolean;
  maxPages?: number;
}

const DATA_DIR = resolve(import.meta.dirname, "../../data");
const db = new LocalDB({ dataDir: DATA_DIR });

async function collectZone(
  zone: { id: string; name: string; slug: string; city: string },
  options: CollectOptions
): Promise<void> {
  console.log(`\n📍 ${zone.name} (${zone.slug})`);

  if (options.dryRun) {
    console.log(`  [DRY RUN] Would scrape ${zone.name}`);
    return;
  }

  try {
    const result = await scrapeWithApify(zone as any, {
      maxPages: options.maxPages,
      limit: options.limit,
    });

    console.log(`  Found ${result.listings.length} unique listings`);

    if (result.listings.length > 0) {
      const snapshot: Snapshot = {
        zoneId: zone.id,
        scrapedAt: result.metadata.scrapedAt,
        source: "immobiliare",
        listingCount: result.listings.length,
        listings: result.listings,
        metadata: {
          requestedLimit: result.metadata.requestedLimit,
          returnedCount: result.metadata.returnedCount,
          hitLimit: result.metadata.hitLimit,
        },
      };

      const { added, updated, unchanged } = await db.saveSnapshotDeduped(snapshot);
      if (added > 0 || updated > 0) {
        console.log(`  ✅ Added ${added} new, updated ${updated} changed (${unchanged} unchanged)`);
      } else {
        console.log(`  ℹ️ All ${unchanged} listings unchanged`);
      }
    } else {
      console.log(`  ⚠️ No listings found`);
    }
  } catch (err) {
    console.error(`  ❌ Error:`, err);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: CollectOptions = {
    zones: [],
  };

  let area: string | null = null;

  for (const arg of args) {
    if (arg.startsWith("--zones=")) {
      options.zones = arg.replace("--zones=", "").split(",");
    } else if (arg.startsWith("--area=")) {
      area = arg.replace("--area=", "");
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.replace("--limit=", ""), 10);
    } else if (arg.startsWith("--max-pages=")) {
      options.maxPages = parseInt(arg.replace("--max-pages=", ""), 10);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--all") {
      options.zones = getAllZones().map((z) => z.slug);
    }
  }

  // Handle --area flag
  if (area) {
    const areaZones = getZonesByArea(area);
    if (areaZones.length === 0) {
      console.error(`Unknown area: ${area}`);
      console.log(`Available areas: ${getAreas().join(", ")}`);
      return;
    }
    options.zones = areaZones.map((z) => z.slug);
  }

  if (options.zones.length === 0) {
    const allZones = getAllZones();
    const areas = getAreas();

    console.log(`
🏠 Il Prezzo Giusto - Data Collection

Usage: bun run jobs/collect-data -- [options]

Options:
  --zones=axa,trastevere      Comma-separated zone slugs
  --area=litorale             Scrape all zones in an area
  --all                       Collect all zones
  --limit=500                 Max listings per zone (default: 1000)
  --max-pages=10              Max pages to scrape (default: 20)
  --dry-run                   Don't actually scrape

Environment:
  APIFY_TOKEN                 API token (get at https://console.apify.com)

Areas (${areas.length}):
${areas.map((a) => `  - ${a} (${allZones.filter((z) => z.area === a).length} zones)`).join("\n")}

Zones (${allZones.length}):
${allZones.map((z) => `  - ${z.slug} (${z.name}) [${z.area}]`).join("\n")}
`);
    return;
  }

  const zones = getZonesBySlug(options.zones);
  if (zones.length === 0) {
    console.error("No valid zones found");
    return;
  }

  console.log(`🏠 Il Prezzo Giusto - Data Collection`);
  console.log(`Zones: ${zones.length} (${zones.map((z) => z.slug).join(", ")})`);
  if (options.limit) console.log(`Limit: ${options.limit} per zone`);
  if (options.dryRun) console.log(`Mode: DRY RUN`);

  for (const zone of zones) {
    await collectZone(zone, options);
    // Small delay between zones
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n✨ Done!`);
}

main().catch(console.error);
