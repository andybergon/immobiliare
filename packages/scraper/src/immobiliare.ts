import { JSDOM } from "jsdom";
import type { Listing, ScrapeOptions } from "./types.js";

const BASE_URL = "https://www.immobiliare.it/vendita-case/roma/";
const PAGE_PARAM = "&pag=";
const RESULTS_PER_PAGE = 25;

function buildUrl(options: ScrapeOptions): string {
  const params = new URLSearchParams();
  params.set("criterio", "rilevanza");

  if (options.maxPrice) {
    params.set("prezzoMassimo", options.maxPrice.toString());
  }
  if (options.minArea) {
    params.set("superficieMinima", options.minArea.toString());
  }

  return `${BASE_URL}?${params.toString()}`;
}

function parsePrice(priceText: string): { price: number; formatted: string } {
  const cleaned = priceText.replace(/da\s*/i, "").trim();
  const numericStr = cleaned.replace(/[€.\s]/g, "").replace(",00", "");
  const price = parseInt(numericStr, 10) || 0;
  return { price, formatted: cleaned };
}

function parseArea(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*m/);
  return match ? parseInt(match[1], 10) : null;
}

function parseRooms(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*local/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractListing(element: Element): Listing | null {
  try {
    const hyperlink = element.querySelector("a.in-card__title");
    if (!hyperlink) return null;

    const title = hyperlink.getAttribute("title") || "";
    const href = hyperlink.getAttribute("href") || "";
    const idMatch = href.match(/(\d+)/);
    const id = idMatch ? idMatch[1] : "";

    const priceEl = element.querySelector(".in-feat__item--main");
    const priceText = priceEl?.textContent?.trim() || "0";
    const { price, formatted } = parsePrice(priceText);

    const images: string[] = [];
    const imgElements = element.querySelectorAll("img[src]");
    imgElements.forEach((img) => {
      const src = img.getAttribute("src");
      if (src && !src.includes("placeholder") && !src.includes("data:image")) {
        images.push(src);
      }
    });

    const locationEl = element.querySelector(".in-card__location, .in-card__address");
    const location = locationEl?.textContent?.trim() || "";

    const featItems = element.querySelectorAll(".in-feat__item");
    let areaText: string | null = null;
    let roomsText: string | null = null;

    featItems.forEach((item) => {
      const text = item.textContent || "";
      if (text.includes("m²")) areaText = text;
      if (text.toLowerCase().includes("local")) roomsText = text;
    });

    return {
      id,
      title,
      price,
      priceFormatted: formatted,
      images,
      location,
      area: parseArea(areaText),
      rooms: parseRooms(roomsText),
      url: href.startsWith("http") ? href : `https://www.immobiliare.it${href}`,
    };
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseListings(html: string): Listing[] {
  const { window } = new JSDOM(html);
  const elements = window.document.querySelectorAll(".in-realEstateResults__item");
  const listings: Listing[] = [];

  elements.forEach((el) => {
    const listing = extractListing(el);
    if (listing && listing.id) {
      listings.push(listing);
    }
  });

  return listings;
}

function getTotalPages(html: string): number {
  const { window } = new JSDOM(html);
  const titleEl = window.document.querySelector(".in-searchList__title");
  const titleText = titleEl?.textContent || "";
  const match = titleText.match(/(\d+)/);
  const totalResults = match ? parseInt(match[1], 10) : 0;
  return Math.ceil(totalResults / RESULTS_PER_PAGE);
}

export async function scrapeImmobiliare(options: ScrapeOptions = {}): Promise<Listing[]> {
  const baseUrl = buildUrl(options);
  const maxPages = options.maxPages ?? 4;

  const firstPageHtml = await fetchPage(baseUrl);
  const totalPages = Math.min(getTotalPages(firstPageHtml), maxPages);

  const allListings = parseListings(firstPageHtml);

  const pagePromises: Promise<Listing[]>[] = [];
  for (let page = 2; page <= totalPages; page++) {
    const pageUrl = `${baseUrl}${PAGE_PARAM}${page}`;
    pagePromises.push(
      fetchPage(pageUrl)
        .then(parseListings)
        .catch(() => [])
    );
  }

  const additionalListings = await Promise.all(pagePromises);
  additionalListings.forEach((listings) => allListings.push(...listings));

  const seen = new Set<string>();
  return allListings.filter((listing) => {
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
}

export async function getListingDetails(url: string): Promise<Listing | null> {
  try {
    const html = await fetchPage(url);
    const { window } = new JSDOM(html);
    const doc = window.document;

    const titleEl = doc.querySelector("h1.in-annuncio__title, .im-titleBlock__title");
    const title = titleEl?.textContent?.trim() || "";

    const idMatch = url.match(/(\d+)/);
    const id = idMatch ? idMatch[1] : "";

    const priceEl = doc.querySelector(".in-detail__mainPrice, .im-mainFeatures__price");
    const priceText = priceEl?.textContent?.trim() || "0";
    const { price, formatted } = parsePrice(priceText);

    const images: string[] = [];
    const imgElements = doc.querySelectorAll(".nd-slideshow img[src], .im-carousel img[src]");
    imgElements.forEach((img) => {
      const src = img.getAttribute("src") || img.getAttribute("data-src");
      if (src && !src.includes("placeholder")) {
        const fullSrc = src.replace(/\?.*$/, "");
        if (!images.includes(fullSrc)) images.push(fullSrc);
      }
    });

    const locationEl = doc.querySelector(".in-location, .im-titleBlock__subtitle");
    const location = locationEl?.textContent?.trim() || "";

    let area: number | null = null;
    let rooms: number | null = null;

    const featEls = doc.querySelectorAll(".in-feat__item, .im-mainFeatures__value");
    featEls.forEach((el) => {
      const text = el.textContent || "";
      if (text.includes("m²") && !area) area = parseArea(text);
      if (text.toLowerCase().includes("local") && !rooms) rooms = parseRooms(text);
    });

    return {
      id,
      title,
      price,
      priceFormatted: formatted,
      images,
      location,
      area,
      rooms,
      url,
    };
  } catch {
    return null;
  }
}
