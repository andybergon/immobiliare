# Mobile API Payload Field Map

This job consumes listing summaries from the immobiliare.it mobile API:

- `GET https://ios-imm-v4.ws-app.com/b2c/v1/properties?...` (same on `android-imm-v4.ws-app.com`)
- We currently scrape via the list endpoint only; direct detail endpoints like `/b2c/v1/properties/{id}` return 403.

The tables below list the fields observed in the list payload (sampled across our 51 Rome zones) and whether we currently parse/persist them.

Legend:

- `Parsed`
  - ✅ = parsed
  - 🟨 = partially parsed
  - ❌ = not parsed
- `Persisted`
  - ✅ = stored in `data/listings/**/immobiliare.json` (possibly normalized)
  - 🧩 = used to build a stored value (not stored as-is)
  - 🟨 = partially stored
  - ❌ = not stored

## Top-Level Listing Object

| API Path | Type (Observed) | Parsed | Persisted | Notes / Mapping |
|---|---:|:---:|:---:|---|
| `id` | int | ✅ | ✅ | `Listing.sourceId` (string) |
| `uuid` | string | ❌ | ❌ | Present but unused |
| `title` | string | ❌ | ❌ | We generate our own `Listing.title` from typology + microzone |
| `rty` | string | ❌ | ❌ | Always looked like `"ad"` |
| `enabled` | bool | ❌ | ❌ | Unused |
| `isUnread` | bool | ❌ | ❌ | Unused |
| `creationDate` | int | ❌ | ❌ | Unix timestamp seconds (listing created) |
| `lastModified` | int | ❌ | ❌ | Unix timestamp seconds (listing updated) |
| `contract.*` | object | ❌ | ❌ | See Contract section |
| `badge.*` | object | ❌ | ❌ | See Badge section |
| `contacts.*` | object | ❌ | ❌ | See Contacts section |
| `subProperties.*` | object | ❌ | ❌ | See SubProperties section |
| `price.*` | object | 🟨 | 🟨 | We use `price.raw` + `price.value`; ignore `discount/startPrice/currency/isHidden` |
| `media.*` | object | 🟨 | 🟨 | We use `media.images` only; ignore floor plans |
| `geography.*` | object | 🟨 | ❌ | We read microzone name for the title, but we do not persist any per-listing location today |
| `topology.*` | object | ✅ | ✅ | Drives most `ListingFeatures` |
| `analytics.*` | object | ✅ | ✅ | Drives several `ListingFeatures` + `otherFeatures` |

## Price

| API Path | Type (Observed) | Parsed | Persisted | Notes / Mapping |
|---|---:|:---:|:---:|---|
| `price.raw` | int | ✅ | ✅ | `Listing.price` (fallback if `analytics.price` is present) |
| `price.value` | string | ✅ | ✅ | `Listing.priceFormatted` |
| `price.currency` | string | ❌ | ❌ | Always looked like `"EUR"` |
| `price.isHidden` | bool | ❌ | ❌ | `true` means “prezzo su richiesta” style listings |
| `price.startPrice` | null or string | ❌ | ❌ | Original price before discount (when present) |
| `price.discount` | null or string | ❌ | ❌ | Discount percentage string (when present) |

## Media

| API Path | Type (Observed) | Parsed | Persisted | Notes / Mapping |
|---|---:|:---:|:---:|---|
| `media.images[]` | list | ✅ | ✅ | We extract image IDs from `hd/sd` URLs → `Listing.images` |
| `media.images[].hd` | string | ✅ | 🧩 | Used to derive stored image IDs |
| `media.images[].sd` | string | ✅ | 🧩 | Used as fallback to derive stored image IDs |
| `media.floorPlans[]` | list | ❌ | ❌ | Present; currently ignored |
| `media.floorPlans[].hd` | string | ❌ | ❌ | Ignored |
| `media.floorPlans[].sd` | string | ❌ | ❌ | Ignored |
| `media.placeholder` | null | ❌ | ❌ | Ignored |

## Geography (Per-Listing Location)

Note: today we *do not persist* per-listing coordinates/address; compact snapshots only store `features` + `images` + `title` + `price`.

| API Path | Type (Observed) | Parsed | Persisted | Notes / Mapping |
|---|---:|:---:|:---:|---|
| `geography.municipality.id` | int | ❌ | ❌ | City id (Roma = 6737) |
| `geography.municipality.name` | string | ✅ | ❌ | Read transiently; compact storage discards location |
| `geography.province.id` | string | ❌ | ❌ | Province code (e.g. `"RM"`) |
| `geography.province.name` | string | ❌ | ❌ | Province name (e.g. `"Roma"`) |
| `geography.macrozone.id` | int | ❌ | ❌ | Macrozone id |
| `geography.macrozone.name` | string | ✅ | ❌ | We set `Listing.location.address` transiently but compact storage discards it |
| `geography.microzone.id` | int | ❌ | ❌ | Microzone id |
| `geography.microzone.name` | string | ✅ | 🧩 | Used to build stored `Listing.title` (and transient `Listing.location.zone`) |
| `geography.street` | string | ❌ | ❌ | Street name (when present) |
| `geography.zipcode` | null or string | ❌ | ❌ | Zip code (when present) |
| `geography.geolocation.latitude` | float | ❌ | ❌ | Per-listing latitude (pins!) |
| `geography.geolocation.longitude` | float | ❌ | ❌ | Per-listing longitude (pins!) |
| `geography.geolocation.visibilityType` | string | ❌ | ❌ | Precision/visibility metadata |
| `geography.geolocation.geoHash` | string | ❌ | ❌ | GeoHash metadata |

## Topology (Property Facts)

| API Path | Type (Observed) | Parsed | Persisted | Notes / Mapping |
|---|---:|:---:|:---:|---|
| `topology.typology.id` | int | ❌ | ❌ | Present; currently unused |
| `topology.typology.name` | string | ✅ | ✅ | `features.typology` (fallback if `analytics.typology` missing) |
| `topology.category.*` | object | ❌ | ❌ | Present; currently ignored |
| `topology.surface.size` | int | ✅ | ✅ | `features.area` |
| `topology.surface.unitOfMeasure` | string | ❌ | ❌ | Always `"m²"` in our samples |
| `topology.rooms` | string | ✅ | ✅ | `features.rooms` + `features.roomsRaw` (preserve `"5+"`) |
| `topology.bathrooms` | null or string | ✅ | ✅ | `features.bathrooms` + `features.bathroomsRaw` |
| `topology.floor` | null or string | ✅ | ✅ | `features.floor` + `features.floorRaw` (preserve `"R"`, `"T"`, etc.) |
| `topology.lift` | null or bool | ✅ | ✅ | `features.elevator` (mobile payload calls it `lift`) |
| `topology.balcony` | bool | ✅ | ✅ | `features.balcony` (fallback from `analytics.otherFeatures`) |
| `topology.terrace` | bool | ✅ | ✅ | `features.terrace` (fallback from `analytics.otherFeatures`) |
| `topology.cellar` | bool | ✅ | ✅ | `features.cellar` (fallback from `analytics.otherFeatures`) |
| `topology.furnished` | bool | ✅ | ✅ | `features.furnished` (fallback from `analytics.otherFeatures`) |
| `topology.isLuxury` | bool | ✅ | ✅ | `features.luxury` |

## Analytics (Search/Marketing Metadata)

| API Path | Type (Observed) | Parsed | Persisted | Notes / Mapping |
|---|---:|:---:|:---:|---|
| `analytics.price` | string or number | ✅ | 🧩 | Fallback for `Listing.price` if `price.raw` missing |
| `analytics.typology` | string | ✅ | ✅ | Preferred for `features.typology` |
| `analytics.numBedrooms` | string or number | ✅ | ✅ | `features.bedrooms` + `features.bedroomsRaw` |
| `analytics.elevator` | bool | ✅ | ✅ | Fallback for `features.elevator` |
| `analytics.floor` | null or string/number | ✅ | ✅ | Fallback for floor parsing |
| `analytics.propertyStatus` | string | ✅ | ✅ | `features.condition` |
| `analytics.heating` | string | ✅ | ✅ | `features.heating` |
| `analytics.otherFeatures[]` | list | ✅ | ✅ | Stored as `features.otherFeatures` (normalized, sorted) |
| `analytics.distanceToSea` | string | ❌ | ❌ | Present in coastal areas (e.g. Ostia) |
| `analytics.viewType[]` | list | ❌ | ❌ | View descriptors (e.g. `"mare"`) |
| `analytics.agencyId` | string | ❌ | ❌ | Agency id |
| `analytics.agencyName` | string | ❌ | ❌ | Agency name |
| `analytics.advertiser` | string | ❌ | ❌ | Advertiser type (e.g. `"agenzia"`) |
| `analytics.adVisibility` | string | ❌ | ❌ | Visibility tier (e.g. `"sky"`) |
| `analytics.region` | string | ❌ | ❌ | Region name string |
| `analytics.province` | string | ❌ | ❌ | Province string |
| `analytics.macrozone` | string | ❌ | ❌ | Macrozone name string |
| `analytics.microzone` | string | ❌ | ❌ | Microzone name string |
| `analytics.priceRange` | string | ❌ | ❌ | Present; ignored |
| `analytics.country` | string | ❌ | ❌ | Present; ignored |
| `analytics.category` | string | ❌ | ❌ | Present; ignored |
| `analytics.contract` | string | ❌ | ❌ | Present; ignored |

## Badge

| API Path | Type (Observed) | Parsed | Persisted | Notes |
|---|---:|:---:|:---:|---|
| `badge.isNew` | bool | ❌ | ❌ | Unused |
| `badge.isNewConstruction` | bool | ❌ | ❌ | Unused |
| `badge.visibility.key` | string | ❌ | ❌ | E.g. `"isSky"` |
| `badge.visibility.label` | string | ❌ | ❌ | E.g. `"Sky"` |
| `badge.visibility.opt[]` | list | ❌ | ❌ | Unused |

## Contacts

| API Path | Type (Observed) | Parsed | Persisted | Notes |
|---|---:|:---:|:---:|---|
| `contacts.agencyId` | int | ❌ | ❌ | Unused |
| `contacts.agencyUuid` | string | ❌ | ❌ | Unused |
| `contacts.bookVisitsEnabled` | bool | ❌ | ❌ | Unused |
| `contacts.priceProposalEnabled` | bool | ❌ | ❌ | Unused |
| `contacts.phones[]` | list | ❌ | ❌ | Unused |
| `contacts.phones[].type` | string | ❌ | ❌ | Unused |
| `contacts.phones[].num` | string | ❌ | ❌ | Unused |

## Contract

| API Path | Type (Observed) | Parsed | Persisted | Notes |
|---|---:|:---:|:---:|---|
| `contract.id` | int | ❌ | ❌ | Unused |
| `contract.name` | string | ❌ | ❌ | Unused |
| `contract.isHidden` | bool | ❌ | ❌ | Unused |

## SubProperties

| API Path | Type (Observed) | Parsed | Persisted | Notes |
|---|---:|:---:|:---:|---|
| `subProperties.count` | int | ❌ | ❌ | Unused |
