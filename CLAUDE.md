# Il Prezzo Giusto

Turborepo + Bun monorepo for a real estate price guessing game using Rome listings from immobiliare.it.

## Structure

```
├── apps/
│   └── ipg/                      # Next.js 16 app (App Router)
│       ├── app/
│       │   ├── page.tsx          # Home (Map vs Arcade mode)
│       │   ├── map/              # Interactive Rome zone map
│       │   └── play/[zone]/      # Game routes
│       │       ├── page.tsx      # Redirects to random listing
│       │       └── [listingId]/  # Game for specific listing
│       └── components/           # React components
├── packages/
│   └── db/                       # @ipg/db - Database abstraction
├── jobs/
│   └── collect-data/             # Apify-based data collection
├── data/
│   ├── zones.json                # Zone definitions (source of truth)
│   └── listings/                 # Hierarchical listing storage
│       └── {region}/             # e.g., lazio
│           └── {city}/           # e.g., roma
│               └── {area}/       # e.g., litorale
│                   └── {slug}/   # e.g., axa
│                       └── immobiliare.json  # Source-specific listings
├── turbo.json
└── package.json
```

## Data Model

### Zone Hierarchy

Zones follow a 4-level hierarchy: **region > city > area > zone**

Example path: `lazio/roma/litorale/axa`

```json
// data/zones.json
{
  "version": 1,
  "updatedAt": "2026-02-01",
  "zones": [
    {
      "id": "roma-axa",
      "name": "Axa",
      "slug": "axa",
      "region": "lazio",
      "city": "roma",
      "area": "litorale",
      "coordinates": { "lat": 41.7283, "lng": 12.3456 }
    }
  ]
}
```

**Areas:** centro (5), nord (10), sud (8), est (9), ovest (7), litorale (8), periferia (4) = 51 zones

### Listing

```typescript
interface Listing {
  id: string;              // "immobiliare-123456"
  source: "immobiliare";
  sourceId: string;        // "123456"
  title: string;
  price: number;
  priceFormatted: string;  // "€ 450.000"
  previousPrice?: number;  // Set when price changes
  images: string[];
  location: { city, zone, zoneId, address? };
  features: { area, rooms, bedrooms, bathrooms, floor, ... };
  url: string;
  scrapedAt: string;
}
```

### Snapshot

```typescript
interface Snapshot {
  zoneId: string;
  scrapedAt: string;
  source: "immobiliare";
  listingCount: number;
  listings: Listing[];
  metadata?: {
    requestedLimit: number;   // e.g., 1000
    returnedCount: number;    // e.g., 1000
    hitLimit: boolean;        // true = may have missed listings
  };
}
```

## Commands

```bash
bun install              # Install all dependencies
bun run build            # Build all packages
bun run dev              # Dev mode (all packages)

# Data collection (requires APIFY_TOKEN in .env.local)
bun run jobs/collect-data                              # Show help
bun run jobs/collect-data -- --zones=axa               # Scrape Axa
bun run jobs/collect-data -- --zones=axa,trastevere    # Multiple zones
bun run jobs/collect-data -- --area=litorale           # All litorale zones
bun run jobs/collect-data -- --all                     # All 51 zones
bun run jobs/collect-data -- --zones=axa --limit=500   # Custom limit
bun run jobs/collect-data -- --dry-run                 # Preview only
```

## Storage

Listings are stored hierarchically following the zone structure:

```
data/listings/{region}/{city}/{area}/{slug}/{source}.json
```

Example:
```
data/listings/lazio/roma/litorale/axa/immobiliare.json
```

Each source file contains a `Snapshot` with all listings for that zone from that source. This structure:
- Keeps data organized by geography
- Supports multiple sources (immobiliare, idealista) per zone
- Makes it easy to browse/debug data manually
- Enables efficient per-zone operations

The database layer (`@ipg/db`) handles path resolution automatically using zone metadata.

## Data Collection

Uses Apify actor `memo23/immobiliare-scraper` (~$0.70/1000 listings, no rental required).

**Defaults:**
- `maxItems`: 1000 per zone
- `maxPages`: 20

**Deduplication:**
- Compares new listings against existing snapshots
- Only saves NEW or CHANGED listings
- Tracks `previousPrice` when price changes
- Logs: `✅ Added 50 new, updated 3 changed (947 unchanged)`

**Metadata:**
- `hitLimit: true` in snapshot metadata means the zone may have more listings than scraped
- Check zones with high listing counts (e.g., Ostia areas have 500-1000+ each)

### Environment Setup

```bash
# One-time: add Apify token to .env.local
echo "APIFY_TOKEN=your_token_here" >> .env.local
```

Get token at: https://console.apify.com/account/integrations (free tier = $5/month)

## App Routes

- `/` - Home: choose Map or Arcade mode
- `/map` - Interactive Leaflet map of Rome zones with listing counts
- `/play/{zone}` - Redirects to random listing in zone
- `/play/{zone}/{listingId}` - Game for specific listing (stable URL)

## API

- `GET /api/zones` - Returns all zones with listing counts

```json
[
  {
    "id": "roma-axa",
    "name": "Axa",
    "slug": "axa",
    "area": "litorale",
    "lat": 41.7283,
    "lng": 12.3456,
    "listingCount": 100
  }
]
```

## Packages

### @ipg/db

```typescript
import { LocalDB, type Listing, type Zone } from "@ipg/db";

const db = new LocalDB({ dataDir: "./data" });
const listings = await db.getListings("roma-axa");
const zones = await db.getZones("litorale");  // Filter by area
const { added, updated, unchanged } = await db.saveSnapshotDeduped(snapshot);
```

## Tech Stack

- **Runtime**: Bun
- **Monorepo**: Turborepo
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Map**: React-Leaflet
- **Scraping**: Apify (memo23/immobiliare-scraper)
- **Storage**: Local JSON

## Common Issues

### Hydration Errors from Browser Extensions

Browser extensions like Dark Reader inject attributes (`data-darkreader-*`), causing React hydration mismatches. Fix: `suppressHydrationWarning` on `<html>` in `layout.tsx`.

### Zone Has 0 Listings

Run the collector for that zone:
```bash
bun run jobs/collect-data -- --zones=trastevere
```

### Hit Limit Warning

If you see `⚠️ Hit limit (1000)`, the zone has more listings. Increase limit:
```bash
bun run jobs/collect-data -- --zones=ostia-ponente --limit=2000
```

### Network/VPN Issues

`bun install` failing with `ConnectionRefused` = temporary network issue. Retry.

### Git Push Permission Denied

Wrong SSH key. Check `~/.ssh/config` for host-specific key configuration.
