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
  - Store 5+ instead of 5 if listing says 5+
  - Store also camere da letto and not only locali and bagni. Store piani/balcone/terrazzo/arredato/tipologia/riscaldamento/climatiz/posto auto. In general all this metadata, then we will decide what to not show later.

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
