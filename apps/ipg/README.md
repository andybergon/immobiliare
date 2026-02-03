# IPG (Il Prezzo Giusto)

Next.js 16 (App Router) web app for a real-estate price guessing game.

## Dev

From repo root (recommended):

```bash
bun install
bun run dev
```

App only:

```bash
cd apps/ipg
bun dev
```

## Data

This app reads local JSON data from `../../data` via `@ipg/db` (`LocalDB`).

API routes:

- `GET /api/zones` zones + coordinates + listing counts
- `GET /api/admin/zones-tree` admin tree + stats (linked only in dev)

## Notes

- Client components should import types/helpers from `@ipg/db/client` (no Node/fs deps).
- Scraping is handled by `jobs/mobile-api-scraper` (mobile API + Apify fallback).
