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
  raw?: MobileApiScrapeDump;
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

export interface MobileApiPageDump {
  offset: number;
  url: string;
  fetchedAt: string;
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  totalActive?: number;
  count?: number;
  offsetReturned?: number;
  propertyIds?: string[];
  error?: string;
}

export interface MobileApiResolverDump {
  url: string;
  fetchedAt: string;
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body?: unknown;
  error?: string;
}

export interface MobileApiScrapeDump {
  schemaVersion: 1;
  scrapedAt: string;
  zone: Pick<Zone, "id" | "name" | "slug" | "region" | "city" | "area" | "immobiliareZ2" | "immobiliareZ3">;
  request: {
    propertiesUrl: string;
    resolverUrl: string;
    params: Record<string, string>;
    limit: number;
    pageSize: number;
    pageDelayMs: number;
  };
  resolver?: MobileApiResolverDump;
  pages: MobileApiPageDump[];
  propertiesById: Record<string, unknown>;
  propertiesMissingId: unknown[];
  stats: {
    totalActive: number;
    fetchedProperties: number;
    uniqueProperties: number;
    normalizedListings: number;
    normalizedFailed: number;
    uniqueListings: number;
  };
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

function normalizeMobileApiResult(property: MobileApiProperty, zone: Zone, scrapedAt: string): Listing | null {
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
    scrapedAt,
  };
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of headers.entries()) out[k] = v;
  return out;
}

async function resolveSearchParams(
  zone: Zone & { immobiliareZ2?: number; immobiliareZ3?: number }
): Promise<{ params: Record<string, string> | null; resolver?: MobileApiResolverDump }> {
  // Use z3 (microzone) if available, otherwise z2 (macrozone)
  if (zone.immobiliareZ3) {
    return { params: {
      cat: "1",       // Category: vendita
      t: "v",         // Type: vendita
      z3: String(zone.immobiliareZ3),  // Microzone ID
    } };
  }

  if (zone.immobiliareZ2) {
    return { params: {
      cat: "1",       // Category: vendita
      t: "v",         // Type: vendita
      z2: String(zone.immobiliareZ2),  // Macrozone ID (broader area)
    } };
  }

  // Fallback: use URL resolver
  const searchUrl = buildSearchUrl(zone);
  console.log(`  ⚠️ No zone ID, using URL resolver`);

  const resolverUrl = `${RESOLVER_URL}?url=${encodeURIComponent(searchUrl)}`;
  const fetchedAt = new Date().toISOString();

  const response = await fetch(resolverUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const dump: MobileApiResolverDump = {
    url: resolverUrl,
    fetchedAt,
    ok: response.ok,
    status: response.status,
    headers: headersToObject(response.headers),
  };

  if (!response.ok) {
    console.log(`  ❌ Resolver failed: ${response.status}`);
    dump.error = `Resolver failed: ${response.status}`;
    return { params: null, resolver: dump };
  }

  let data: ResolverResponse;
  try {
    data = (await response.json()) as ResolverResponse;
    dump.body = data as unknown;
  } catch (err) {
    console.log(`  ❌ Resolver JSON parse failed`);
    dump.error = err instanceof Error ? err.message : String(err);
    return { params: null, resolver: dump };
  }

  if (data.type !== "search" || !data.params) {
    console.log(`  ❌ Invalid resolver response: type=${data.type}`);
    dump.error = `Invalid resolver response: type=${data.type}`;
    return { params: null, resolver: dump };
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.params)) {
    params[key] = String(value);
  }

  return { params, resolver: dump };
}

async function fetchPage(params: Record<string, string>, offset: number): Promise<{ dump: MobileApiPageDump; body: MobileApiResponse | null }> {
  const urlParams = new URLSearchParams(params);
  urlParams.set("start", String(offset));
  const url = `${PROPERTIES_URL}?${urlParams}`;
  const fetchedAt = new Date().toISOString();

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const dump: MobileApiPageDump = {
    offset,
    url,
    fetchedAt,
    ok: response.ok,
    status: response.status,
    headers: headersToObject(response.headers),
  };

  if (!response.ok) {
    dump.error = `Properties API failed: ${response.status}`;
    return { dump, body: null };
  }

  try {
    const body = (await response.json()) as MobileApiResponse;
    return { dump, body };
  } catch (err) {
    dump.error = err instanceof Error ? err.message : String(err);
    return { dump, body: null };
  }
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

  const resolved = await resolveSearchParams(zone);
  if (!resolved.params) {
    return {
      listings: [],
      metadata: {
        requestedLimit: limit,
        returnedCount: 0,
        hitLimit: false,
        scrapedAt,
      },
      raw: {
        schemaVersion: 1,
        scrapedAt,
        zone: {
          id: zone.id,
          name: zone.name,
          slug: zone.slug,
          region: zone.region,
          city: zone.city,
          area: zone.area,
          immobiliareZ2: zone.immobiliareZ2,
          immobiliareZ3: zone.immobiliareZ3,
        },
        request: {
          propertiesUrl: PROPERTIES_URL,
          resolverUrl: RESOLVER_URL,
          params: {},
          limit,
          pageSize: PAGE_SIZE,
          pageDelayMs: pageDelay,
        },
        ...(resolved.resolver ? { resolver: resolved.resolver } : {}),
        pages: [],
        propertiesById: {},
        propertiesMissingId: [],
        stats: {
          totalActive: 0,
          fetchedProperties: 0,
          uniqueProperties: 0,
          normalizedListings: 0,
          normalizedFailed: 0,
          uniqueListings: 0,
        },
      },
    };
  }

  const params = resolved.params;
  const pages: MobileApiPageDump[] = [];
  const propertiesById = new Map<string, unknown>();
  const propertiesMissingId: unknown[] = [];
  const allPropertyIds: string[] = [];

  const first = await fetchPage(params, 0);
  pages.push(first.dump);
  if (!first.body) {
    return {
      listings: [],
      metadata: {
        requestedLimit: limit,
        returnedCount: 0,
        hitLimit: false,
        scrapedAt,
      },
      raw: {
        schemaVersion: 1,
        scrapedAt,
        zone: {
          id: zone.id,
          name: zone.name,
          slug: zone.slug,
          region: zone.region,
          city: zone.city,
          area: zone.area,
          immobiliareZ2: zone.immobiliareZ2,
          immobiliareZ3: zone.immobiliareZ3,
        },
        request: {
          propertiesUrl: PROPERTIES_URL,
          resolverUrl: RESOLVER_URL,
          params,
          limit,
          pageSize: PAGE_SIZE,
          pageDelayMs: pageDelay,
        },
        ...(resolved.resolver ? { resolver: resolved.resolver } : {}),
        pages,
        propertiesById: {},
        propertiesMissingId,
        stats: {
          totalActive: 0,
          fetchedProperties: 0,
          uniqueProperties: 0,
          normalizedListings: 0,
          normalizedFailed: 0,
          uniqueListings: 0,
        },
      },
    };
  }

  const firstPage = first.body;
  const totalAvailable = firstPage.totalActive || 0;
  const toFetch = Math.min(totalAvailable, limit);

  console.log(`  Total available: ${totalAvailable} listings`);
  if (toFetch < totalAvailable) {
    console.log(`  Limiting to: ${toFetch} (--limit=${limit})`);
  }

  const firstList = firstPage.list || [];
  const firstIds: string[] = [];
  for (const property of firstList) {
    const id = typeof property?.id === "number" ? String(property.id) : null;
    if (!id) {
      propertiesMissingId.push(property as unknown);
      continue;
    }
    propertiesById.set(id, property as unknown);
    firstIds.push(id);
    allPropertyIds.push(id);
  }
  pages[0].totalActive = firstPage.totalActive;
  pages[0].count = firstPage.count;
  pages[0].offsetReturned = firstPage.offset;
  pages[0].propertyIds = firstIds;
  let offset = PAGE_SIZE;

  const totalPages = Math.ceil(toFetch / PAGE_SIZE);
  let currentPage = 1;

  while (offset < toFetch) {
    currentPage++;
    process.stdout.write(`  Fetching page ${currentPage}/${totalPages}...\r`);

    const page = await fetchPage(params, offset);
    pages.push(page.dump);
    if (!page.body) break;

    const list = page.body.list || [];
    if (list.length === 0) break;

    const ids: string[] = [];
    for (const property of list) {
      const id = typeof property?.id === "number" ? String(property.id) : null;
      if (!id) {
        propertiesMissingId.push(property as unknown);
        continue;
      }
      propertiesById.set(id, property as unknown);
      ids.push(id);
      allPropertyIds.push(id);
    }

    pages[pages.length - 1].totalActive = page.body.totalActive;
    pages[pages.length - 1].count = page.body.count;
    pages[pages.length - 1].offsetReturned = page.body.offset;
    pages[pages.length - 1].propertyIds = ids;

    offset += PAGE_SIZE;

    await new Promise((r) => setTimeout(r, pageDelay));
  }

  console.log(`  Fetched ${allPropertyIds.length} raw results from ${currentPage} pages`);

  const listings: Listing[] = [];
  let failed = 0;

  for (const id of allPropertyIds) {
    const property = propertiesById.get(id) as MobileApiProperty | undefined;
    if (!property) continue;
    const listing = normalizeMobileApiResult(property, zone, scrapedAt);
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

  const propertiesByIdObj: Record<string, unknown> = {};
  for (const [id, value] of propertiesById.entries()) {
    propertiesByIdObj[id] = value;
  }

  return {
    listings: unique,
    metadata: {
      requestedLimit: limit,
      returnedCount: allPropertyIds.length,
      hitLimit,
      scrapedAt,
    },
    raw: {
      schemaVersion: 1,
      scrapedAt,
      zone: {
        id: zone.id,
        name: zone.name,
        slug: zone.slug,
        region: zone.region,
        city: zone.city,
        area: zone.area,
        immobiliareZ2: zone.immobiliareZ2,
        immobiliareZ3: zone.immobiliareZ3,
      },
      request: {
        propertiesUrl: PROPERTIES_URL,
        resolverUrl: RESOLVER_URL,
        params,
        limit,
        pageSize: PAGE_SIZE,
        pageDelayMs: pageDelay,
      },
      ...(resolved.resolver ? { resolver: resolved.resolver } : {}),
      pages,
      propertiesById: propertiesByIdObj,
      propertiesMissingId,
      stats: {
        totalActive: totalAvailable,
        fetchedProperties: allPropertyIds.length,
        uniqueProperties: propertiesById.size,
        normalizedListings: listings.length,
        normalizedFailed: failed,
        uniqueListings: unique.length,
      },
    },
  };
}
