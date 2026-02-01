# Il Prezzo Giusto

Turborepo + Bun monorepo for a real estate price guessing game using Italian listings.

## Structure

```
├── apps/
│   └── ipg/                      # Next.js 16 app (App Router)
│       ├── app/
│       │   ├── page.tsx          # Home with Italy map
│       │   ├── [region]/         # Region zone selection
│       │   └── play/[zone]/      # Game for specific zone
│       └── components/           # React components
├── packages/
│   ├── scraper/                  # @ipg/scraper - Real estate scraper
│   └── db/                       # @ipg/db - Database abstraction
├── jobs/
│   └── collect-data/             # Data collection job (Playwright)
├── data/                         # Local JSON data storage
│   ├── zones.json
│   └── snapshots/{date}/
├── turbo.json
└── package.json
```

## Commands

```bash
bun install              # Install all dependencies
bun run build            # Build all packages
bun run dev              # Dev mode (all packages)

# Data collection
bun run jobs/collect-data -- --zones=axa --limit=10
bun run jobs/collect-data -- --all --max-pages=3
```

## Packages

### @ipg/db

Database abstraction with swappable implementations.

```typescript
import { LocalDB, type Listing, type Zone } from "@ipg/db";

const db = new LocalDB({ dataDir: "./data" });
const listings = await db.getListings("lazio-roma-axa");
const randomListing = await db.getRandomListing("lazio-roma-axa");
```

### @ipg/scraper

Scrapes immobiliare.it for property listings (currently blocked by DataDome, needs work).

### ipg (Next.js App)

The price guessing game:

- `/` - Home page with Italy map
- `/lazio` - Region page with zone selection
- `/play/axa` - Game for Axa zone

## Data Collection

The collect-data job uses Playwright to scrape listings. Currently blocked by DataDome CAPTCHA - needs one of:
- Captcha solving service (2captcha)
- Residential proxies
- Manual cookie extraction

For development, use sample data in `data/snapshots/`.

## Development

```bash
# Run dev server
cd apps/ipg && bun dev

# Test with sample data at http://localhost:3000
```

## Tech Stack

- **Runtime**: Bun
- **Monorepo**: Turborepo
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Scraping**: Playwright with stealth plugin
- **Storage**: Local JSON (swappable to SQLite/Postgres)
