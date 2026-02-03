# Il Prezzo Giusto - Implementation Plan

## Overview

A price guessing game for Italian real estate. Users select regions/zones on an Italian map, view property listings (photos, metadata), and guess prices.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        IPG Web App                          │
│  (Next.js - Map → Zone Selection → Property Cards → Game)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer (DB)                        │
│         Local JSON → SQLite → Postgres (future)             │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Collection Job                      │
│     Cron script: scrapes immobiliare.it + idealista.it      │
│              (parameterized by zones)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Completed ✅

### Sprint 1: Data Foundation
- [x] Monorepo setup (Turborepo + Bun)
- [x] Basic scraper (mobile API + Apify fallback)
- [x] @ipg/db package with local JSON storage
- [x] Data collection job with Playwright
- [x] Zone configuration (Axa, Casal Palocco, Infernetto)
- [x] Sample data for testing

### Sprint 3: Map & Navigation
- [x] Italy map component (SVG-based)
- [x] Zone selector component
- [x] Routing: `/` → `/[region]` → `/play/[zone]`

### Sprint 4: Game Polish
- [x] Property card with image carousel
- [x] Price guess form with formatting
- [x] Score display with accuracy %
- [x] "Next property" navigation

---

## Remaining Work

### Data Collection

The immobiliare.it **website HTML** is blocked by DataDome, but data collection works via the
public **mobile app API** (`ios-imm-v4.ws-app.com`) with no API key required.

- Default: mobile API scraper (free)
- Fallback: Apify actor (paid)

### Sprint 2: Idealista Scraper
- [ ] Add Idealista scraper (also uses anti-bot protection)
- [ ] Extract zone IDs from both sites

### Sprint 5: Production Readiness
- [ ] SQLite implementation (`packages/db/src/sqlite.ts`)
- [ ] GitHub Actions workflow for data collection
- [ ] Vercel/Railway deployment
- [ ] Image proxy/caching

### Future Enhancements
- [ ] User accounts & leaderboards
- [ ] More regions beyond Lazio
- [ ] Score persistence (localStorage → DB)
- [ ] Social sharing
- [ ] Mobile app

---

## Current Status

**Working:** Full game flow with sample data
- Home page with Italy map
- Region selection (Lazio)
- Zone selection (Axa, Casal Palocco, Infernetto)
- Property card with image carousel
- Price guessing with score calculation

**Data collection:** Works via mobile API scraper (website HTML scraping is still blocked by DataDome)

**Commands:**
```bash
# Install
bun install

# Run everything (recommended)
bun run dev

# Run the app only
cd apps/ipg && bun dev

# Test data collection (mobile API)
bun run jobs/mobile-api-scraper -- --zones=axa --limit=5
```

---

## File Structure (Implemented)

```
immobiliare/
├── apps/
│   └── ipg/                        # Next.js 16 app
│       ├── app/
│       │   ├── page.tsx            # Home with Italy map
│       │   ├── [region]/page.tsx   # Region zone selection
│       │   └── play/[zone]/        # Game pages
│       └── components/
│           ├── ItalyMap.tsx
│           ├── ZoneSelector.tsx
│           ├── PropertyCard.tsx
│           ├── ImageCarousel.tsx
│           ├── PriceGuessForm.tsx
│           └── ScoreDisplay.tsx
├── packages/
│   └── db/                         # @ipg/db
│       └── src/
│           ├── types.ts
│           ├── local.ts            # JSON storage
│           └── index.ts
├── jobs/
│   └── mobile-api-scraper/         # Data collection (mobile API + Apify fallback)
│       ├── index.ts
│       ├── mobile-scraper.ts
│       ├── apify-scraper.ts
│       └── zones.ts
├── data/
│   ├── zones.json
│   └── listings/                   # per-zone compact snapshots
│       └── {region}/{city}/{area}/{slug}/immobiliare.json
├── turbo.json
├── package.json
├── CLAUDE.md
└── PLAN.md
```
