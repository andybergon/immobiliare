import type { Listing, Zone } from "@ipg/db";
import { extractImageId } from "@ipg/db/client";

const RESOLVER_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/resolver/url";
const PROPERTIES_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/properties";
const PAGE_SIZE = 20;

export interface ScrapeResult {
  listings: Listing[];
  metadata: {
    requestedLimit: number;
    returnedCount: number;
    hitLimit: boolean;
    scrapedAt: string;
  };
}

interface MobileApiProperty {
  id?: number;
  uuid?: string;
  title?: string;
  price?: {
    raw?: number;
    value?: string;
  };
  media?: {
    images?: Array<{ hd?: string; sd?: string }>;
  };
  geography?: {
    municipality?: { name?: string };
    province?: { abbreviation?: string; name?: string };
    region?: { name?: string };
    macrozone?: { name?: string };
    microzone?: { name?: string; id?: number };
    geolocation?: { latitude?: number; longitude?: number };
    street?: { name?: string };
    zipcode?: string;
  };
  topology?: {
    typology?: string;
    surface?: { size?: number | string };
    rooms?: number | string;
    bathrooms?: number | string;
    floor?: number | string;
    lift?: boolean;
    balcony?: boolean;
  };
  analytics?: {
    price?: number | string;
    typology?: string;
    numBedrooms?: number | string;
    elevator?: boolean;
    propertyStatus?: string;
    agencyName?: string;
  };
  lastModified?: string;
  creationDate?: string;
}

interface MobileApiResponse {
  totalActive?: number;
  count?: number;
  offset?: number;
  list?: MobileApiProperty[];
}

interface ResolverResponse {
  type?: string;
  params?: Record<string, string | number>;
}

function buildSearchUrl(zone: Zone): string {
  return `https://www.immobiliare.it/vendita-case/${zone.city}/${zone.slug}/`;
}

function parseNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractImages(property: MobileApiProperty): string[] {
  const imageIds: string[] = [];
  if (property.media?.images) {
    for (const img of property.media.images) {
      const url = img?.hd || img?.sd;
      if (url && !url.includes("placeholder") && !url.includes("data:image")) {
        const id = extractImageId(url);
        if (id) imageIds.push(id);
      }
    }
  }
  return imageIds;
}

function normalizeMobileApiResult(property: MobileApiProperty, zone: Zone): Listing | null {
  const sourceId = String(property.id || "");
  if (!sourceId) return null;

  const price = property.price?.raw || parseNumber(property.analytics?.price) || 0;

  const priceFormatted = property.price?.value || `€ ${price.toLocaleString("it-IT")}`;
  const images = extractImages(property);

  const typology = property.analytics?.typology || property.topology?.typology || "Immobile";
  const microzone = property.geography?.microzone?.name || zone.name;
  const title = `${typology} in ${microzone}`;

  const area = parseNumber(property.topology?.surface?.size);
  const rooms = parseNumber(property.topology?.rooms);
  const bathrooms = parseNumber(property.topology?.bathrooms);
  const floor = parseNumber(property.topology?.floor);
  const bedrooms = parseNumber(property.analytics?.numBedrooms);
  const elevator = property.topology?.lift ?? property.analytics?.elevator ?? null;
  const condition = property.analytics?.propertyStatus || null;

  const url = `https://www.immobiliare.it/annunci/${sourceId}/`;

  return {
    id: `immobiliare-${sourceId}`,
    source: "immobiliare",
    sourceId,
    title,
    price,
    priceFormatted,
    images,
    location: {
      region: property.geography?.region?.name || zone.region,
      province: property.geography?.province?.abbreviation || "",
      city: property.geography?.municipality?.name || zone.city,
      zone: microzone,
      zoneId: zone.id,
      address: property.geography?.macrozone?.name,
    },
    features: {
      area,
      rooms,
      bedrooms,
      bathrooms,
      floor,
      totalFloors: null,
      elevator,
      energyClass: null,
      yearBuilt: null,
      condition,
    },
    url,
    scrapedAt: new Date().toISOString(),
  };
}

async function resolveSearchParams(zone: Zone & { immobiliareZ2?: number; immobiliareZ3?: number }): Promise<Record<string, string> | null> {
  // Use z3 (microzone) if available, otherwise z2 (macrozone)
  if (zone.immobiliareZ3) {
    return {
      c: "6737",      // Roma city ID
      cat: "1",       // Category: vendita
      t: "v",         // Type: vendita
      pr: "RM",       // Province: Roma
      z3: String(zone.immobiliareZ3),  // Microzone ID
    };
  }

  if (zone.immobiliareZ2) {
    return {
      c: "6737",      // Roma city ID
      cat: "1",       // Category: vendita
      t: "v",         // Type: vendita
      pr: "RM",       // Province: Roma
      z2: String(zone.immobiliareZ2),  // Macrozone ID (broader area)
    };
  }

  // Fallback: use URL resolver
  const searchUrl = buildSearchUrl(zone);
  console.log(`  ⚠️ No zone ID, using URL resolver`);

  const response = await fetch(`${RESOLVER_URL}?url=${encodeURIComponent(searchUrl)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    console.log(`  ❌ Resolver failed: ${response.status}`);
    return null;
  }

  const data: ResolverResponse = await response.json();

  if (data.type !== "search" || !data.params) {
    console.log(`  ❌ Invalid resolver response: type=${data.type}`);
    return null;
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.params)) {
    params[key] = String(value);
  }

  return params;
}

async function fetchPage(params: Record<string, string>, offset: number): Promise<MobileApiResponse> {
  const urlParams = new URLSearchParams(params);
  urlParams.set("start", String(offset));

  const response = await fetch(`${PROPERTIES_URL}?${urlParams}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    throw new Error(`Properties API failed: ${response.status}`);
  }

  return response.json();
}

export async function scrapeWithMobileApi(
  zone: Zone & { immobiliareZ2?: number; immobiliareZ3?: number },
  options: { limit?: number; pageDelay?: number } = {}
): Promise<ScrapeResult> {
  const limit = options.limit || 10000;
  const pageDelay = options.pageDelay ?? 50;
  const scrapedAt = new Date().toISOString();

  console.log(`  Using mobile API (free)`);
  if (zone.immobiliareZ3) {
    console.log(`  z3=${zone.immobiliareZ3} (microzone)`);
  } else if (zone.immobiliareZ2) {
    console.log(`  z2=${zone.immobiliareZ2} (macrozone - broader area)`);
  } else {
    console.log(`  Search URL: ${buildSearchUrl(zone)} (resolver)`);
  }

  const params = await resolveSearchParams(zone);
  if (!params) {
    return {
      listings: [],
      metadata: {
        requestedLimit: limit,
        returnedCount: 0,
        hitLimit: false,
        scrapedAt,
      },
    };
  }

  const firstPage = await fetchPage(params, 0);
  const totalAvailable = firstPage.totalActive || 0;
  const toFetch = Math.min(totalAvailable, limit);

  console.log(`  Total available: ${totalAvailable} listings`);
  if (toFetch < totalAvailable) {
    console.log(`  Limiting to: ${toFetch} (--limit=${limit})`);
  }

  const allProperties: MobileApiProperty[] = firstPage.list || [];
  let offset = PAGE_SIZE;

  const totalPages = Math.ceil(toFetch / PAGE_SIZE);
  let currentPage = 1;

  while (offset < toFetch) {
    currentPage++;
    process.stdout.write(`  Fetching page ${currentPage}/${totalPages}...\r`);

    const page = await fetchPage(params, offset);
    if (!page.list || page.list.length === 0) break;

    allProperties.push(...page.list);
    offset += PAGE_SIZE;

    await new Promise((r) => setTimeout(r, pageDelay));
  }

  console.log(`  Fetched ${allProperties.length} raw results from ${currentPage} pages`);

  const listings: Listing[] = [];
  let failed = 0;

  for (const property of allProperties) {
    const listing = normalizeMobileApiResult(property, zone);
    if (listing) {
      listings.push(listing);
    } else {
      failed++;
    }
  }

  if (failed > 0) {
    console.log(`  Normalized ${listings.length} valid, ${failed} failed`);
  }

  const seen = new Set<string>();
  const unique = listings.filter((l) => {
    if (seen.has(l.sourceId)) return false;
    seen.add(l.sourceId);
    return true;
  });

  const hitLimit = totalAvailable > limit;

  return {
    listings: unique,
    metadata: {
      requestedLimit: limit,
      returnedCount: allProperties.length,
      hitLimit,
      scrapedAt,
    },
  };
}
