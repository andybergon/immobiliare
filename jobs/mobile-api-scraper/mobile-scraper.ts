import type { Listing, Zone } from "@ipg/db";
import { extractImageId } from "@ipg/db/client";
import { parseCount, parseFloor, parseNumber } from "./parsing.js";

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
    typology?: string | { id?: number; name?: string };
    surface?: { size?: number | string };
    rooms?: number | string;
    bathrooms?: number | string;
    floor?: number | string;
    lift?: boolean;
    balcony?: boolean;
    terrace?: boolean;
    cellar?: boolean;
    furnished?: boolean;
    isLuxury?: boolean;
  };
  analytics?: {
    price?: number | string;
    typology?: string;
    numBedrooms?: number | string;
    elevator?: boolean;
    floor?: number | string;
    propertyStatus?: string;
    agencyName?: string;
    heating?: string;
    otherFeatures?: string[];
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

function normalizeOtherFeatures(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (normalized.length === 0) return null;
  normalized.sort();
  return Array.from(new Set(normalized));
}

function getTypologyName(property: MobileApiProperty): string | null {
  const fromAnalytics = property.analytics?.typology?.trim();
  if (fromAnalytics) return fromAnalytics;

  const topo = property.topology?.typology;
  if (typeof topo === "string") return topo.trim() || null;
  if (topo && typeof topo === "object" && "name" in topo) {
    const name = (topo as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }

  return null;
}

function hasAnyFeature(otherFeatures: string[] | null, needles: string[]): boolean {
  if (!otherFeatures) return false;
  return otherFeatures.some((f) => needles.some((n) => f.includes(n)));
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

  const typologyName = getTypologyName(property);
  const titleTypology = typologyName || "Immobile";
  const microzone = property.geography?.microzone?.name || zone.name;
  const title = `${titleTypology} in ${microzone}`;

  const area = parseNumber(property.topology?.surface?.size);
  const roomsParsed = parseCount(property.topology?.rooms);
  const bathroomsParsed = parseCount(property.topology?.bathrooms);
  const bedroomsParsed = parseCount(property.analytics?.numBedrooms);
  const floorParsed = parseFloor(property.topology?.floor ?? property.analytics?.floor);
  const otherFeatures = normalizeOtherFeatures(property.analytics?.otherFeatures);

  const balcony = property.topology?.balcony ?? (hasAnyFeature(otherFeatures, ["balcone"]) ? true : null);
  const terrace = property.topology?.terrace ?? (hasAnyFeature(otherFeatures, ["terrazzo"]) ? true : null);
  const furnished =
    property.topology?.furnished ?? (hasAnyFeature(otherFeatures, ["arredato"]) ? true : null);
  const cellar = property.topology?.cellar ?? (hasAnyFeature(otherFeatures, ["cantina"]) ? true : null);
  const luxury = property.topology?.isLuxury ?? null;

  const airConditioning = hasAnyFeature(otherFeatures, ["aria condizion", "condizion", "climatizz"])
    ? true
    : null;
  const parking = hasAnyFeature(otherFeatures, ["posto auto", "garage", "box", "parcheggio", "autorimessa"])
    ? true
    : null;

  const heating = property.analytics?.heating || null;
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
      rooms: roomsParsed.value,
      roomsRaw: roomsParsed.raw,
      bedrooms: bedroomsParsed.value,
      bedroomsRaw: bedroomsParsed.raw,
      bathrooms: bathroomsParsed.value,
      bathroomsRaw: bathroomsParsed.raw,
      floor: floorParsed.value,
      floorRaw: floorParsed.raw,
      totalFloors: null,
      elevator,
      energyClass: null,
      yearBuilt: null,
      condition,
      typology: typologyName,
      heating,
      balcony,
      terrace,
      furnished,
      cellar,
      luxury,
      airConditioning,
      parking,
      otherFeatures,
    },
    url,
    scrapedAt: new Date().toISOString(),
  };
}

async function resolveSearchParams(zone: Zone & { immobiliareZ2?: number; immobiliareZ3?: number }): Promise<Record<string, string> | null> {
  // Use z3 (microzone) if available, otherwise z2 (macrozone)
  if (zone.immobiliareZ3) {
    return {
      cat: "1",       // Category: vendita
      t: "v",         // Type: vendita
      z3: String(zone.immobiliareZ3),  // Microzone ID
    };
  }

  if (zone.immobiliareZ2) {
    return {
      cat: "1",       // Category: vendita
      t: "v",         // Type: vendita
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
