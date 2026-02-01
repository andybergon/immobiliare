import { LocalDB, type Listing, type Snapshot, type Zone } from "@ipg/db";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "playwright";
import { getZonesBySlug, getAllZones } from "./zones.js";
import { resolve } from "path";

chromium.use(StealthPlugin());

interface CollectOptions {
  zones: string[];
  limit?: number;
  dryRun?: boolean;
  maxPages?: number;
  source?: "immobiliare" | "idealista" | "all";
  headless?: boolean;
}

const DATA_DIR = resolve(import.meta.dirname, "../../data");
const db = new LocalDB({ dataDir: DATA_DIR });

let browser: Browser | null = null;

async function getBrowser(headless: boolean = true): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browser;
}

async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function parseNumber(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parsePrice(text: string): { price: number; formatted: string } {
  const cleaned = text.replace(/da\s*/i, "").trim();
  const numericStr = cleaned.replace(/[€.\s]/g, "").replace(",00", "");
  const price = parseInt(numericStr, 10) || 0;
  return { price, formatted: cleaned };
}

async function extractListingsFromPage(page: Page, zone: Zone): Promise<Listing[]> {
  return page.evaluate((zoneData: Zone) => {
    const listings: Listing[] = [];
    const selectors = [
      "li.nd-list__item",
      ".in-realEstateResults__item",
      "[class*='RealEstateListItem']",
      "article[data-id]",
      ".listing-item",
      "ul.in-realEstateResults > li",
    ];

    let items: NodeListOf<Element> | null = null;
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        items = found;
        break;
      }
    }

    if (!items || items.length === 0) {
      console.log("DEBUG: No items found. Page HTML snippet:", document.body?.innerHTML?.substring(0, 500));
      return listings;
    }

    items.forEach((item) => {
      try {
        const linkSelectors = ["a[href*='/annunci/']", "a[href*='immobiliare.it']", "a.in-card__title"];
        let link: HTMLAnchorElement | null = null;
        for (const sel of linkSelectors) {
          link = item.querySelector(sel) as HTMLAnchorElement;
          if (link?.href?.includes("/annunci/")) break;
        }
        if (!link) return;

        const href = link.href;
        const idMatch = href.match(/\/annunci\/(\d+)/) || href.match(/(\d{6,})/);
        const sourceId = idMatch ? idMatch[1] : "";
        if (!sourceId) return;

        const titleSelectors = [".nd-mediaObject__title", "[class*='title']", ".in-card__title", "h2", "h3"];
        let titleEl: Element | null = null;
        for (const sel of titleSelectors) {
          titleEl = item.querySelector(sel);
          if (titleEl?.textContent?.trim()) break;
        }
        const title = titleEl?.textContent?.trim() || "Immobile";

        const priceSelectors = [".in-realEstateListCard__features--main", ".nd-list__item .in-feat__item--main", "[class*='price']", ".in-feat__item--main"];
        let priceEl: Element | null = null;
        for (const sel of priceSelectors) {
          priceEl = item.querySelector(sel);
          if (priceEl?.textContent?.includes("€")) break;
        }
        const priceText = priceEl?.textContent?.trim() || "0";
        const cleaned = priceText.replace(/da\s*/i, "").trim();
        const numericStr = cleaned.replace(/[€.\s]/g, "").replace(",00", "");
        const price = parseInt(numericStr, 10) || 0;

        if (price === 0) return;

        const images: string[] = [];
        const imgElements = item.querySelectorAll("img[src]");
        imgElements.forEach((img) => {
          const src = (img as HTMLImageElement).src || img.getAttribute("data-src");
          if (src && !src.includes("placeholder") && !src.includes("data:image") && !src.includes("svg")) {
            const fullSrc = src.replace(/\/\d+x\d+\//, "/1200x900/");
            if (!images.includes(fullSrc)) images.push(fullSrc);
          }
        });

        const locationEl = item.querySelector("[class*='location'], [class*='address'], .in-card__location");
        const address = locationEl?.textContent?.trim();

        let area: number | null = null;
        let rooms: number | null = null;
        let bathrooms: number | null = null;
        let floor: number | null = null;

        const featItems = item.querySelectorAll("[class*='feat'], [class*='feature'], li");
        featItems.forEach((feat) => {
          const text = feat.textContent || "";
          if (text.includes("m²") && !area) {
            const match = text.match(/(\d+)/);
            area = match ? parseInt(match[1], 10) : null;
          } else if ((text.toLowerCase().includes("local") || text.toLowerCase().includes("vani")) && !rooms) {
            const match = text.match(/(\d+)/);
            rooms = match ? parseInt(match[1], 10) : null;
          } else if (text.toLowerCase().includes("bagn") && !bathrooms) {
            const match = text.match(/(\d+)/);
            bathrooms = match ? parseInt(match[1], 10) : null;
          } else if (text.toLowerCase().includes("piano") && !floor) {
            const match = text.match(/(\d+)/);
            floor = match ? parseInt(match[1], 10) : null;
          }
        });

        listings.push({
          id: `immobiliare-${sourceId}`,
          source: "immobiliare" as const,
          sourceId,
          title,
          price,
          priceFormatted: cleaned,
          images,
          location: {
            region: zoneData.region,
            province: zoneData.province,
            city: zoneData.city,
            zone: zoneData.name,
            zoneId: zoneData.id,
            address,
          },
          features: {
            area,
            rooms,
            bedrooms: null,
            bathrooms,
            floor,
            totalFloors: null,
            elevator: null,
            energyClass: null,
            yearBuilt: null,
            condition: null,
          },
          url: href,
          scrapedAt: new Date().toISOString(),
        });
      } catch {
        // Skip invalid listings
      }
    });

    return listings;
  }, zone);
}

async function getTotalResultsAndPages(page: Page): Promise<{ total: number; pages: number }> {
  return page.evaluate(() => {
    const selectors = [
      ".in-searchList__title",
      "[class*='searchTitle']",
      "h1",
      ".nd-pageHeader__title",
      "[data-cy='result-count']",
    ];

    let titleText = "";
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.match(/\d/)) {
        titleText = el.textContent;
        break;
      }
    }

    const match = titleText.match(/(\d[\d.]*)/);
    const total = match ? parseInt(match[1].replace(/\./g, ""), 10) : 0;

    const paginationLinks = document.querySelectorAll("a[href*='pag='], .pagination a, nav[aria-label*='pagination'] a");
    let maxPage = 1;
    paginationLinks.forEach((link) => {
      const text = link.textContent?.trim();
      const pageNum = parseInt(text || "0", 10);
      if (!isNaN(pageNum) && pageNum > maxPage) {
        maxPage = pageNum;
      }
    });

    const pages = total > 0 ? Math.ceil(total / 25) : maxPage;
    return { total, pages };
  });
}

function buildUrl(zone: Zone, page: number = 1): string {
  const base = `https://www.immobiliare.it/vendita-case/${zone.city}/`;
  const params = new URLSearchParams();
  params.set("criterio", "rilevanza");

  if (zone.immobiliareParams?.idQuartiere) {
    params.append("idQuartiere[]", zone.immobiliareParams.idQuartiere);
  }
  if (zone.immobiliareParams?.idZona) {
    params.append("idMZona[]", zone.immobiliareParams.idZona);
  }

  if (page > 1) {
    params.set("pag", page.toString());
  }

  return `${base}?${params.toString()}`;
}

async function handleCookieConsent(page: Page): Promise<void> {
  try {
    const consentButton = await page.$('button[id*="accept"], button[class*="accept"], #didomi-notice-agree-button, .iubenda-cs-accept-btn');
    if (consentButton) {
      await consentButton.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch {
    // No consent dialog
  }
}

async function scrapeImmobiliareZone(
  zone: Zone,
  options: { maxPages?: number; limit?: number; headless?: boolean }
): Promise<Listing[]> {
  const maxPages = options.maxPages ?? 10;
  const limit = options.limit;
  const listings: Listing[] = [];

  const b = await getBrowser(options.headless ?? true);
  const context = await b.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "it-IT",
  });

  const page = await context.newPage();

  try {
    console.log(`  Fetching page 1...`);
    const firstUrl = buildUrl(zone, 1);

    await page.goto(firstUrl, { waitUntil: "networkidle", timeout: 60000 });

    await handleCookieConsent(page);

    await page.waitForSelector("ul.in-realEstateResults li, .nd-list__item, article, li[class*='item']", {
      timeout: 15000,
    }).catch(async () => {
      console.log(`  Warning: Could not find listing elements`);
      const html = await page.content();
      const fs = await import("fs/promises");
      await fs.writeFile("/tmp/immobiliare-debug.html", html);
      console.log(`  Debug: Saved page HTML to /tmp/immobiliare-debug.html`);
    });

    await new Promise((r) => setTimeout(r, 3000));

    const { total, pages: totalPagesRaw } = await getTotalResultsAndPages(page);
    const totalPages = Math.min(totalPagesRaw, maxPages);
    console.log(`  Found ${total} total listings, ${totalPages} pages to scrape`);

    const pageListings = await extractListingsFromPage(page, zone);
    listings.push(...pageListings);
    console.log(`    Page 1: ${pageListings.length} listings`);

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      if (limit && listings.length >= limit) break;

      console.log(`  Fetching page ${pageNum}/${totalPages}...`);

      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

      const url = buildUrl(zone, pageNum);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".in-realEstateResults__item, [class*='RealEstateListItem']", {
        timeout: 10000,
      }).catch(() => {});

      await new Promise((r) => setTimeout(r, 1500));

      const pageListings = await extractListingsFromPage(page, zone);
      listings.push(...pageListings);
      console.log(`    Page ${pageNum}: ${pageListings.length} listings`);
    }
  } finally {
    await context.close();
  }

  const seen = new Set<string>();
  const unique = listings.filter((l) => {
    if (seen.has(l.sourceId)) return false;
    seen.add(l.sourceId);
    return true;
  });

  return limit ? unique.slice(0, limit) : unique;
}

async function collectZone(zone: Zone, options: CollectOptions): Promise<void> {
  console.log(`\n📍 Collecting data for ${zone.name} (${zone.id})`);

  if (options.source === "all" || options.source === "immobiliare" || !options.source) {
    console.log(`  Source: immobiliare.it`);

    if (options.dryRun) {
      console.log(`  [DRY RUN] Would scrape immobiliare.it for ${zone.name}`);
    } else {
      try {
        const listings = await scrapeImmobiliareZone(zone, {
          maxPages: options.maxPages,
          limit: options.limit,
          headless: options.headless,
        });

        console.log(`  Found ${listings.length} unique listings`);

        if (listings.length > 0) {
          const snapshot: Snapshot = {
            zoneId: zone.id,
            scrapedAt: new Date().toISOString(),
            source: "immobiliare",
            listingCount: listings.length,
            listings,
          };

          await db.saveSnapshot(snapshot);
          console.log(`  ✅ Saved snapshot`);
        } else {
          console.log(`  ⚠️ No listings found, skipping snapshot`);
        }
      } catch (err) {
        console.error(`  ❌ Error:`, err);
      }
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: CollectOptions = {
    zones: [],
    source: "immobiliare",
    headless: true,
  };

  for (const arg of args) {
    if (arg.startsWith("--zones=")) {
      options.zones = arg.replace("--zones=", "").split(",");
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.replace("--limit=", ""), 10);
    } else if (arg.startsWith("--max-pages=")) {
      options.maxPages = parseInt(arg.replace("--max-pages=", ""), 10);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--source=")) {
      options.source = arg.replace("--source=", "") as "immobiliare" | "idealista" | "all";
    } else if (arg === "--all") {
      options.zones = getAllZones().map((z) => z.slug);
    } else if (arg === "--no-headless" || arg === "--headed") {
      options.headless = false;
    }
  }

  if (options.zones.length === 0) {
    console.log(`
Usage: bun run jobs/collect-data -- [options]

Options:
  --zones=axa,casal-palocco    Comma-separated zone slugs
  --all                         Collect all zones
  --limit=10                    Max listings per zone
  --max-pages=5                 Max pages to scrape
  --source=immobiliare          Source (immobiliare, idealista, all)
  --dry-run                     Don't actually scrape
  --no-headless                 Show browser window

Available zones:
${getAllZones()
  .map((z) => `  - ${z.slug} (${z.name})`)
  .join("\n")}
`);
    return;
  }

  const zones = getZonesBySlug(options.zones);
  if (zones.length === 0) {
    console.error("No valid zones found");
    return;
  }

  console.log(`🏠 Il Prezzo Giusto - Data Collection`);
  console.log(`Zones: ${zones.map((z) => z.name).join(", ")}`);
  if (options.limit) console.log(`Limit: ${options.limit} listings per zone`);
  if (options.dryRun) console.log(`Mode: DRY RUN`);

  try {
    await db.saveZones(zones);

    for (const zone of zones) {
      await collectZone(zone, options);
      await new Promise((r) => setTimeout(r, 2000));
    }
  } finally {
    await closeBrowser();
  }

  console.log(`\n✨ Done!`);
}

main().catch(console.error);
