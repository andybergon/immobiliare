import { LocalDB, type Snapshot } from "@ipg/db";
import { getZonesBySlug, getAllZones, getZonesByArea, getAreas } from "./zones.js";
import { scrapeWithMobileApi } from "./mobile-scraper.js";
import { scrapeWithApify } from "./apify-scraper.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { resolve } from "path";

// Load .env.local from project root if it exists
const envPath = resolve(import.meta.dirname, "../../.env.local");
if (existsSync(envPath)) {
  const content = await readFile(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

type ScraperType = "mobile" | "apify";

interface CollectOptions {
  zones: string[];
  scraper: ScraperType;
  limit?: number;
  maxPages?: number;
  sleepBetweenListings?: number;
  sleepBetweenZones?: number;
  dryRun?: boolean;
}

const DATA_DIR = resolve(import.meta.dirname, "../../data");
const db = new LocalDB({ dataDir: DATA_DIR });

const PROPERTIES_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/properties";
const PAGE_SIZE = 20;

async function getZoneListingCount(zone: { immobiliareZ2?: number; immobiliareZ3?: number }): Promise<number | null> {
  if (!zone.immobiliareZ3 && !zone.immobiliareZ2) return null;

  const params = new URLSearchParams({
    cat: "1",
    t: "v",
    ...(zone.immobiliareZ3 ? { z3: String(zone.immobiliareZ3) } : { z2: String(zone.immobiliareZ2) }),
  });

  try {
    const response = await fetch(`${PROPERTIES_URL}?${params}&start=0`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.totalActive || 0;
  } catch {
    return null;
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

async function collectZone(
  zone: { id: string; name: string; slug: string; city: string },
  options: CollectOptions
): Promise<void> {
  console.log(`\n📍 ${zone.name} (${zone.slug})`);

  if (options.dryRun) {
    console.log(`  [DRY RUN] Would scrape ${zone.name} with ${options.scraper} scraper`);
    return;
  }

  try {
    const result =
      options.scraper === "apify"
        ? await scrapeWithApify(zone as any, {
            limit: options.limit,
            maxPages: options.maxPages,
          })
        : await scrapeWithMobileApi(zone as any, {
            limit: options.limit,
            pageDelay: options.sleepBetweenListings,
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
    scraper: "mobile",
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
    } else if (arg.startsWith("--scraper=")) {
      const scraper = arg.replace("--scraper=", "") as ScraperType;
      if (scraper !== "mobile" && scraper !== "apify") {
        console.error(`Unknown scraper: ${scraper}. Use 'mobile' or 'apify'.`);
        return;
      }
      options.scraper = scraper;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--sleep-between-listings-ms=")) {
      options.sleepBetweenListings = parseInt(arg.replace("--sleep-between-listings-ms=", ""), 10);
    } else if (arg.startsWith("--sleep-between-zones-s=")) {
      options.sleepBetweenZones = parseInt(arg.replace("--sleep-between-zones-s=", ""), 10);
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

Usage: bun run jobs/mobile-api-scraper -- [options]

Options:
  --zones=axa,trastevere      Comma-separated zone slugs
  --area=litorale             Scrape all zones in an area
  --all                       Collect all zones
  --limit=500                 Max listings per zone (default: 1000 for apify, unlimited for mobile)
  --max-pages=10              Max pages to scrape (apify only, default: 20)
  --scraper=mobile|apify      Scraper to use (default: mobile)
  --sleep-between-listings-ms=50  Milliseconds between page fetches (default: 50)
  --sleep-between-zones-s=2       Seconds between zones (default: 0)
  --dry-run                       Don't actually scrape

Scrapers:
  mobile                      Free, fast, uses immobiliare.it mobile API
  apify                       Paid (~$0.70/1000), requires APIFY_TOKEN env var

Environment:
  APIFY_TOKEN                 API token for apify scraper (https://console.apify.com)

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
  console.log(`Scraper: ${options.scraper}`);
  console.log(`Zones: ${zones.length} (${zones.map((z) => z.slug).join(", ")})`);
  if (options.limit) console.log(`Limit: ${options.limit} per zone`);
  if (options.maxPages && options.scraper === "apify") console.log(`Max pages: ${options.maxPages}`);
  if (options.sleepBetweenListings) console.log(`Sleep between listings: ${options.sleepBetweenListings}ms`);
  if (options.sleepBetweenZones) console.log(`Sleep between zones: ${options.sleepBetweenZones}s`);
  if (options.dryRun) console.log(`Mode: DRY RUN`);

  // Fetch listing counts and estimate time
  console.log(`\n📊 Fetching listing counts...`);
  const zoneCounts: { zone: typeof zones[0]; count: number | null }[] = [];
  let totalListings = 0;
  let unknownZones = 0;

  for (const zone of zones) {
    const count = await getZoneListingCount(zone as any);
    zoneCounts.push({ zone, count });
    if (count !== null) {
      totalListings += count;
    } else {
      unknownZones++;
    }
  }

  // Estimate time
  const totalPages = Math.ceil(totalListings / PAGE_SIZE);
  const pageDelayMs = options.sleepBetweenListings || 50;
  const apiTimeSeconds = Math.ceil(totalPages * pageDelayMs / 1000);
  const zoneDelaySeconds = options.sleepBetweenZones || 0;
  const sleepTimeSeconds = (zones.length - 1) * zoneDelaySeconds;
  const totalTimeSeconds = apiTimeSeconds + sleepTimeSeconds;

  console.log(`\n📈 Estimate:`);
  console.log(`  Zones: ${zones.length}${unknownZones > 0 ? ` (${unknownZones} with unknown counts)` : ""}`);
  console.log(`  Total listings: ~${totalListings.toLocaleString()}${unknownZones > 0 ? "+" : ""}`);
  console.log(`  Pages to fetch: ~${totalPages}`);
  console.log(`  API time: ~${formatDuration(apiTimeSeconds)} (${pageDelayMs}ms/page)`);
  if (zoneDelaySeconds > 0) {
    console.log(`  Zone delays: ~${formatDuration(sleepTimeSeconds)} (${zoneDelaySeconds}s × ${zones.length - 1})`);
  }
  console.log(`  Total time: ~${formatDuration(totalTimeSeconds)}`);

  // Run zones sequentially with sleep
  for (let i = 0; i < zones.length; i++) {
    await collectZone(zones[i], options);
    if (zoneDelaySeconds > 0 && i < zones.length - 1) {
      console.log(`  💤 Sleeping ${zoneDelaySeconds}s...`);
      await new Promise((r) => setTimeout(r, zoneDelaySeconds * 1000));
    }
  }

  console.log(`\n✨ Done!`);
}

main().catch(console.error);
