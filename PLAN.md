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
- [x] Basic scraper (@ipg/scraper)
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

### Data Collection (Blocked)

The scraping job is blocked by DataDome CAPTCHA protection on immobiliare.it. Options to resolve:

1. **Captcha Solving Service** (2captcha, Anti-Captcha)
   - Cost: ~$2-3 per 1000 solves
   - Pro: Works reliably
   - Con: Ongoing cost

2. **Residential Proxies**
   - Services: Bright Data, Oxylabs
   - Pro: Avoid detection
   - Con: Expensive ($15+/GB)

3. **Manual Cookie Extraction**
   - Visit site in browser, export cookies
   - Pro: Free
   - Con: Cookies expire, manual process

4. **Official API**
   - Contact immobiliare.it for API access
   - Pro: Reliable, legal
   - Con: May not exist or be expensive

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

**Blocked:** Real-time data collection due to anti-bot protection

**Commands:**
```bash
# Run the app
cd apps/ipg && bun dev

# Test data collection (will be blocked by CAPTCHA)
bun run jobs/collect-data -- --zones=axa --limit=5 --no-headless
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
│   ├── scraper/                    # @ipg/scraper
│   └── db/                         # @ipg/db
│       └── src/
│           ├── types.ts
│           ├── local.ts            # JSON storage
│           └── index.ts
├── jobs/
│   └── collect-data/               # Playwright scraper
│       ├── index.ts
│       └── zones.ts
├── data/
│   ├── zones.json
│   └── snapshots/2026-01-31/
│       └── lazio-roma-axa-immobiliare.json
├── turbo.json
├── package.json
├── CLAUDE.md
└── PLAN.md
```
