import { ApifyClient } from "apify-client";
import type { Listing, Zone } from "@ipg/db";

// Apify actor for immobiliare.it scraping
// Try: memo23/immobiliare-scraper (pay-per-result), ecomscrape/immobiliare-property-search-scraper
const ACTOR_ID = "memo23/immobiliare-scraper";

interface ApifyScraperOptions {
  limit?: number;
  maxPages?: number;
  directUrl?: string;
}

export interface ScrapeResult {
  listings: Listing[];
  metadata: {
    requestedLimit: number;
    returnedCount: number;
    hitLimit: boolean;
    scrapedAt: string;
  };
}

interface ApifyListingResult {
  id?: number;
  title?: string;
  shareUrl?: string;
  analytics?: {
    price?: string;
    region?: string;
    province?: string;
    macrozone?: string;
    microzone?: string;
    typology?: string;
    numBedrooms?: string;
    elevator?: boolean;
    propertyStatus?: string;
  };
  price?: {
    visible?: boolean;
    formattedValue?: string;
    value?: string;
  };
  media?: {
    images?: Array<{ hd?: string; sd?: string }>;
    floorPlans?: Array<{ hd?: string; sd?: string }>;
  };
  mainData?: Array<{
    header?: string;
    rows?: Array<{ label?: string; value?: string }>;
  }>;
  energyClass?: { value?: string };
  description?: { value?: string };
}

function buildSearchUrl(zone: Zone): string {
  return `https://www.immobiliare.it/vendita-case/${zone.city}/${zone.slug}/`;
}

function parseNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parsePrice(value: unknown): { price: number; formatted: string } {
  if (!value) return { price: 0, formatted: "N/A" };
  if (typeof value === "number") {
    return { price: value, formatted: `€ ${value.toLocaleString("it-IT")}` };
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const numValue = obj.value || obj.price || obj.amount;
    if (typeof numValue === "number") {
      return { price: numValue, formatted: `€ ${numValue.toLocaleString("it-IT")}` };
    }
  }
  if (typeof value !== "string") return { price: 0, formatted: "N/A" };
  const cleaned = value.replace(/da\s*/i, "").trim();
  const numericStr = cleaned.replace(/[€.\s]/g, "").replace(",00", "");
  const price = parseInt(numericStr, 10) || 0;
  return { price, formatted: cleaned };
}

function extractImages(result: ApifyListingResult): string[] {
  const images: string[] = [];

  if (result.media?.images) {
    for (const img of result.media.images) {
      const url = img?.hd || img?.sd;
      if (url) {
        images.push(url);
      }
    }
  }

  return images.filter((img) => img && !img.includes("placeholder") && !img.includes("data:image"));
}

function getMainDataValue(result: ApifyListingResult, label: string): string | null {
  if (!result.mainData) return null;
  for (const section of result.mainData) {
    if (!section.rows) continue;
    const row = section.rows.find((r) => r.label?.toLowerCase() === label.toLowerCase());
    if (row?.value) return row.value;
  }
  return null;
}

function normalizeApifyResult(result: ApifyListingResult, zone: Zone): Listing | null {
  const sourceId = String(result.id || "");
  if (!sourceId) return null;

  const priceStr = result.analytics?.price || result.price?.value || result.price?.formattedValue;
  const { price, formatted } = parsePrice(priceStr);
  if (price === 0) return null;

  const images = extractImages(result);
  const area = parseNumber(getMainDataValue(result, "Surface"));
  const rooms = parseNumber(getMainDataValue(result, "Rooms"));
  const bathrooms = parseNumber(getMainDataValue(result, "Bathrooms"));
  const floor = parseNumber(getMainDataValue(result, "Floor"));
  const bedrooms = parseNumber(getMainDataValue(result, "Bedrooms") || result.analytics?.numBedrooms);
  const energyClass = result.energyClass?.value || null;
  const elevator = result.analytics?.elevator ?? null;

  const url = result.shareUrl || `https://www.immobiliare.it/annunci/${sourceId}/`;

  const typology = result.analytics?.typology || result.title || "Immobile";
  const microzone = result.analytics?.microzone || zone.name;
  const title = `${typology} in ${microzone}`;

  return {
    id: `immobiliare-${sourceId}`,
    source: "immobiliare",
    sourceId,
    title,
    price,
    priceFormatted: formatted,
    images,
    location: {
      region: result.analytics?.region || zone.region,
      province: result.analytics?.province || zone.province,
      city: zone.city,
      zone: result.analytics?.microzone || zone.name,
      zoneId: zone.id,
      address: result.analytics?.macrozone,
    },
    features: {
      area,
      rooms,
      bedrooms,
      bathrooms,
      floor,
      totalFloors: null,
      elevator,
      energyClass,
      yearBuilt: null,
      condition: result.analytics?.propertyStatus || null,
    },
    url,
    scrapedAt: new Date().toISOString(),
  };
}

export async function scrapeWithApify(
  zone: Zone,
  options: ApifyScraperOptions = {}
): Promise<ScrapeResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error(
      "APIFY_TOKEN environment variable is required.\n" +
      "Get your free API token at: https://console.apify.com/account/integrations\n" +
      "(Free tier includes $5/month credits)"
    );
  }

  const client = new ApifyClient({ token });
  const searchUrl = options.directUrl || buildSearchUrl(zone);

  console.log(`  Using Apify actor: ${ACTOR_ID}`);
  console.log(`  Search URL: ${searchUrl}`);

  const limit = options.limit || 1000;
  const input = {
    startUrls: [{ url: searchUrl }],
    maxItems: limit,
    maxPages: options.maxPages || 20,
  };

  console.log(`  Starting actor run (this may take 30-60 seconds)...`);
  const startTime = Date.now();

  // Start run with custom name for Apify console visibility
  const runName = `ipg-${zone.area}-${zone.slug}`;
  const run = await client.actor(ACTOR_ID).start(input);

  // Update run name via API (shows in Apify console)
  try {
    await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: runName }),
    });
  } catch {
    // Name update is optional, continue if it fails
  }

  // Wait for run to finish
  await client.run(run.id).waitForFinish();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`  Actor finished in ${duration}s, fetching results...`);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  console.log(`  Processing ${items.length} raw results...`);

  const listings: Listing[] = [];
  let processed = 0;
  let failed = 0;
  for (const item of items) {
    const listing = normalizeApifyResult(item as ApifyListingResult, zone);
    if (listing) {
      listings.push(listing);
    } else {
      failed++;
    }
    processed++;
    if (processed % 25 === 0) {
      console.log(`    Processed ${processed}/${items.length} (${listings.length} valid, ${failed} failed)`);
    }
  }
  if (processed % 25 !== 0) {
    console.log(`    Processed ${processed}/${items.length} (${listings.length} valid, ${failed} failed)`);
  }

  // Deduplicate by sourceId
  const seen = new Set<string>();
  const unique = listings.filter((l) => {
    if (seen.has(l.sourceId)) return false;
    seen.add(l.sourceId);
    return true;
  });

  const hitLimit = items.length >= limit;
  if (hitLimit) {
    console.log(`  ⚠️ Hit limit (${limit}) - there may be more listings available`);
  }

  return {
    listings: unique,
    metadata: {
      requestedLimit: limit,
      returnedCount: items.length,
      hitLimit,
      scrapedAt: new Date().toISOString(),
    },
  };
}
