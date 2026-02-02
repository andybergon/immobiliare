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
│   └── collect-data/             # Data collection (mobile API or Apify)
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

**Our hierarchy:** region > city > area > zone (e.g., `lazio/roma/litorale/axa`)

**Immobiliare.it hierarchy:** pr (province) > c (city) > z2 (macrozone) > z3 (microzone)

```json
// data/zones.json
{
  "version": 1,
  "updatedAt": "2026-02-02",
  "zones": [
    {
      "id": "roma-axa",
      "name": "Axa",
      "slug": "axa",
      "region": "lazio",
      "city": "roma",
      "area": "litorale",
      "coordinates": { "lat": 41.7283, "lng": 12.3456 },
      "immobiliareZ2": 10259,  // Macrozone: "Axa, Casal Palocco, Infernetto"
      "immobiliareZ3": 10962   // Microzone: "Axa" (specific)
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

# Data collection (mobile API is default, free, and recommended)
bun run jobs/collect-data                              # Show help
bun run jobs/collect-data -- --zones=axa               # Scrape Axa (mobile API)
bun run jobs/collect-data -- --zones=axa,trastevere    # Multiple zones
bun run jobs/collect-data -- --area=litorale           # All litorale zones
bun run jobs/collect-data -- --all                     # All 51 zones
bun run jobs/collect-data -- --zones=axa --limit=500   # Custom limit
bun run jobs/collect-data -- --scraper=apify           # Use Apify instead (paid)
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

Two scrapers available:

### Mobile API Scraper (Default, Recommended)

Uses the immobiliare.it mobile app API (`ios-imm-v4.ws-app.com`). **Free, fast, no API key required.**

- Paginates through all listings (20 per page)
- Returns structured JSON with all listing fields
- No rate limiting observed
- No limit on results

```bash
bun run jobs/collect-data -- --zones=axa              # Uses mobile API by default
bun run jobs/collect-data -- --scraper=mobile         # Explicit
```

### Apify Scraper (Fallback)

Uses Apify actor `memo23/immobiliare-scraper` (~$0.70/1000 listings). Requires `APIFY_TOKEN`.

```bash
bun run jobs/collect-data -- --zones=axa --scraper=apify
bun run jobs/collect-data -- --zones=axa --scraper=apify --max-pages=10
```

**Apify Setup:**
```bash
echo "APIFY_TOKEN=your_token_here" >> .env.local
```
Get token at: https://console.apify.com/account/integrations (free tier = $5/month)

### Deduplication

Both scrapers use the same deduplication logic:
- Compares new listings against existing snapshots
- Only saves NEW or CHANGED listings
- Tracks `previousPrice` when price changes
- Logs: `✅ Added 50 new, updated 3 changed (947 unchanged)`

## Immobiliare.it Mobile API

The mobile app API (`ios-imm-v4.ws-app.com`) is publicly accessible without DataDome blocking. **This is now the default scraper** - it returns full listing data, not just counts.

### Endpoints

**1. URL Resolver** - Converts website URL to API parameters
```
GET https://ios-imm-v4.ws-app.com/b2c/v1/resolver/url?url={encoded_url}
```

Example:
```bash
curl "https://ios-imm-v4.ws-app.com/b2c/v1/resolver/url?url=https://www.immobiliare.it/vendita-case/roma/axa/"
```

Response:
```json
{
  "type": "search",
  "params": {
    "z3": "10962",    // microzone ID
    "cat": 1,         // category (1=vendita)
    "t": "v",         // type (v=vendita)
    "pr": "RM",       // province
    "c": 6737,        // city ID (Roma)
    "z2": "10259"     // macrozone ID
  }
}
```

**2. Properties Search** - Get listings with total count
```
GET https://ios-imm-v4.ws-app.com/b2c/v1/properties?{params}&start={offset}
```

Example:
```bash
curl "https://ios-imm-v4.ws-app.com/b2c/v1/properties?z3=10962&cat=1&t=v&pr=RM&c=6737&z2=10259&start=0"
```

Response:
```json
{
  "totalActive": 121,    // <-- Total listings for this zone
  "count": 20,           // Items per page
  "list": [...],         // Listing summaries
  "offset": 0
}
```

### Immobiliare.it Zone Hierarchy

Immobiliare.it organizes Rome into a geographic hierarchy:

```
pr (Province)     → "RM" (Roma)
c  (City)         → 6737 (Roma city)
z2 (Macrozone)    → Broad areas grouping multiple neighborhoods
z3 (Microzone)    → Specific neighborhoods
```

**z1 and z4 do not exist** (tested - z1 seems unused, z4 has no effect).

#### Examples

| Our Zone | z2 (Macrozone) | z3 (Microzone) |
|----------|----------------|----------------|
| axa | 10259 "Axa, Casal Palocco, Infernetto" | 10962 "Axa" |
| casal-palocco | 10259 (same) | 12721 "Casal Palocco" |
| infernetto | 10259 (same) | 10964 "Infernetto" |
| lido-di-ostia | 10181 "Lido di Ostia, Ostia Antica, Castel Fusano" | ❌ none |
| centro-storico | 10303 "Centro Storico" | ❌ none (has many microzones) |
| trieste | 10147 "Salario, Trieste" | 12719 "Trieste - Coppedè" |

#### Zone Data in zones.json

Each zone has both IDs for flexible querying:

```json
{
  "id": "roma-axa",
  "name": "Axa",
  "slug": "axa",
  "immobiliareZ2": 10259,  // Macrozone (broader)
  "immobiliareZ3": 10962   // Microzone (specific)
}
```

The scraper uses z3 when available (more precise), falls back to z2 (broader area).

#### The Lido di Ostia Problem

"Lido di Ostia" is a z2-only zone (no z3). When queried:
- z2=10181 returns ~1000 listings from ALL microzones in that macrozone
- This includes Ostia Antica, Ostia Levante, Ostia Ponente (which we also scrape separately)
- **Result:** Duplicate listings in our database

This is intentional - storing both z2 and z3 lets us decide later how to group/display them.

#### Discovering Zone IDs

```bash
# Get all zones by sampling properties
bun run jobs/collect-data/get-all-zones.ts

# Test specific zone IDs
curl "https://ios-imm-v4.ws-app.com/b2c/v1/properties?c=6737&cat=1&t=v&pr=RM&z3=10962&start=0"
```

### Get Counts Script

```bash
# Get listing counts for all zones (free, instant)
bun run jobs/collect-data/get-counts.ts

# Filter by area
bun run jobs/collect-data/get-counts.ts --area=litorale

# Specific zones
bun run jobs/collect-data/get-counts.ts --zones=axa,trastevere

# JSON output
bun run jobs/collect-data/get-counts.ts --json
```

## App Routes

- `/` - Home: choose Map or Arcade mode
- `/map` - Interactive Leaflet map of Rome zones with listing counts
- `/play/{zone}` - Redirects to random listing in zone
- `/play/{zone}/{listingId}` - Game for specific listing (stable URL)

## Price Input

The price input has smart formatting rules to make entering prices quick:

| Digits Typed | Display | Value | Example |
|--------------|---------|-------|---------|
| 1-3 | XXX.000 | ×1000 | "350" → €350,000 |
| 4-6 | XXX.YYY | Replace zeros | "3505" → €350,500 |
| 7-9 | X.XXX.XXX | Full number | "1500000" → €1,500,000 |

- Max 9 digits (up to €999,999,999)
- Grayed placeholder zeros disappear as you fill digits 4-6
- For 7+ digits, standard thousand-separator formatting applies
- Logic extracted to `apps/ipg/lib/price-input.ts` with unit tests

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
- **Scraping**: Mobile API (default) or Apify (fallback)
- **Storage**: Local JSON

## Gotchas

### Image Overlay Contrast

Real estate photos are typically bright/light backgrounds. All UI elements overlaid on images (arrows, spinners, counters, badges) must use dark colors with high opacity (e.g., `bg-black/90`, `border-black`) to ensure visibility. Avoid white or low-opacity overlays.

### Apify Task Naming (if using --scraper=apify)

Apify task names only allow letters, digits, and hyphens (not at start/end). We use `--` as hierarchy separator:
```
lazio--roma--litorale--axa
```

This differentiates from slugs that contain single hyphens (e.g., `casal-palocco`).

### Apify Free Tier Limit (if using --scraper=apify)

Free tier returns max 100 items regardless of `maxItems` setting. The mobile API scraper has no such limit and is recommended instead.

### Direct HTTP Blocked (DataDome)

Direct HTTP requests to `immobiliare.it` website return 403 (DataDome protection). Use either:
- **Mobile API** (`ios-imm-v4.ws-app.com`) - free, full listing data (recommended)
- **Apify actor** - paid per result, fallback option

### Parallel Zone Scraping

The collector runs zones in parallel using `Promise.all`. Apify handles concurrent tasks without rate limiting (tested with 8 concurrent zones). Console output may interleave but results are correct.

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
