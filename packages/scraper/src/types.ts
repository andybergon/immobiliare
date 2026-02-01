export interface Listing {
  id: string;
  title: string;
  price: number;
  priceFormatted: string;
  images: string[];
  location: string;
  area: number | null;
  rooms: number | null;
  url: string;
}

export interface ScrapeOptions {
  maxPrice?: number;
  minArea?: number;
  zones?: string[];
  maxPages?: number;
}
