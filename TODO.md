# TODO


## UI
### Map
- Make Map view have precise location of listing and have a zoom in logic show the detailed position when we zoom in rather than just the zones
  - we might need to rescrape to store location of each house?
- Map: use google map instead of OpenMaps? or in general a nicer looking map?

### Listing
- mobile, wheel to select number rather than number input, keep the number clickable to manually change

### NEW
- Stats local, on the right, keep mapping of annunci and guessed, show stats on how close guesses where
- add more cities, regions

## Data

- Scraping improvements
  - [x] Extend `ListingFeatures` in `packages/db/src/types.ts` to preserve richer metadata (keep numeric fields, add raw text variants)
  - [x] Update `jobs/mobile-api-scraper/mobile-scraper.ts` normalization
  - [x] Update `jobs/mobile-api-scraper/apify-scraper.ts` normalization (at least the "5+" fix)
  - [x] Fix dedupe in `packages/db/src/local.ts` (set `previousPrice` only when price changes)
  - [ ] Backfill by re-scraping zones to populate new metadata
  - [ ] Add unit tests for parsing helpers (counts + floors)

  Details
  - `ListingFeatures` additions (store everything now, decide UI later)
    - counts: add `roomsRaw`, `bathroomsRaw`, `bedroomsRaw` (e.g. "5+")
    - floor: add `floorRaw` (e.g. "R") + keep numeric `floor`
    - add `typology`, `heating`
    - add booleans: `balcony`, `terrace`, `furnished`, `cellar`, `luxury`
    - add `airConditioning`, `parking` (derived from feature strings when available)
    - add `otherFeatures: string[]` (from mobile `analytics.otherFeatures`)
  - Mobile API notes
    - `/b2c/v1/properties/{id}` currently returns 403, so we rely on list payload `GET /b2c/v1/properties?...`
  - Future map pins
    - store per-listing location from `geography.geolocation` (lat/lng + visibilityType/geohash) and `geography.street`/`geography.zipcode`
  - Optional
    - remove Rome-only hardcoding (`c=6737`, `pr=RM`) where possible (mobile API works with just z2/z3 + cat/t)

### [ ] Restructure data to z2/z3 hierarchy
Replace custom "area" grouping with immobiliare.it's z2/z3 hierarchy for consistency across Italy.

**Current structure:**
```
data/listings/lazio/roma/litorale/axa/immobiliare.json
                         ↑ custom "area" (manual, Rome-only)
```

**Target structure:**
```
data/listings/lazio/roma/10259-axa-casal-palocco/10962-axa/immobiliare.json
                         ↑ z2 ID + slug            ↑ z3 ID + slug
```

**Zone discovery:**
- Mobile API (iOS/Android): No zones endpoint found, only returns z2/z3 per property
- Web API: Protected by DataDome (requires JS challenge)
- **Browser + Resolver approach** (bypasses DataDome):
  1. Browser automation loads immobiliare.it search page (passes JS challenge)
  2. Click "Scegli la zona" dropdown → extracts z2 zone URLs with slugs
  3. Mobile API resolver converts URL → z2 ID:
     ```
     GET ios-imm-v4.ws-app.com/b2c/v1/resolver/url?url=.../roma/axa-casal-palocco-infernetto/
     → { "params": { "z2": "10259" } }
     ```
  4. Click into z2 zone → dropdown shows z3 microzones → resolve those too
- Fallback: Sample properties to discover zones (`get-all-zones.ts`)

**Tasks:**
1. [x] Find API to get zone tree → Use browser + resolver approach
2. [ ] Update zones.json schema to include z2/z3 slugs
3. [ ] Update LocalDB.getListingPath() to use z2/z3 path
4. [ ] Migration script to move files to new structure
5. [ ] Update scraper to use new paths
6. [ ] Update admin tree view

**Benefits:**
- Automatic consistency across all Italian cities
- No manual "area" curation needed
- Direct mapping to immobiliare.it API structure

### Other
- Move data out of the app bundle (currently in `data/` directory)
- Don't load all data upfront but only what we need, keep summaries separated and load them early to give early feedback. progressively load data
- [x] Android API check → Yes, exists at `android-imm-v4.ws-app.com`, same endpoints as iOS API
