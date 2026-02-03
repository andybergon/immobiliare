import { LocalDB } from "@ipg/db";
import { resolve } from "path";
import { getZ2Name } from "@/lib/immobiliare";

const DATA_DIR = resolve(process.cwd(), "../../data");
const db = new LocalDB({ dataDir: DATA_DIR });

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
};

interface Z3Node {
  type: "z3";
  id: string;
  name: string;
  slug: string;
  z3: number;
  listingCount: number;
}

interface Z2Node {
  type: "z2";
  z2: number;
  name: string;
  listingCount: number;
  children: Z3Node[];
}

interface CityNode {
  type: "city";
  id: number;
  name: string;
  listingCount: number;
  children: Z2Node[];
}

interface RegionNode {
  type: "region";
  name: string;
  listingCount: number;
  children: CityNode[];
}

export async function GET() {
  const zones = await db.getZones();

  const zonesWithCounts = await Promise.all(
    zones.map(async (zone) => ({
      ...zone,
      listingCount: await db.getListingCount(zone.id),
    }))
  );

  // Build tree: region > city > z2 > z3
  const tree: RegionNode[] = [];
  const regionMap = new Map<string, RegionNode>();
  const cityMap = new Map<string, CityNode>();
  const z2Map = new Map<string, Z2Node>();

  for (const zone of zonesWithCounts) {
    // Get or create region
    let region = regionMap.get(zone.region);
    if (!region) {
      region = {
        type: "region",
        name: zone.region,
        listingCount: 0,
        children: [],
      };
      regionMap.set(zone.region, region);
      tree.push(region);
    }

    // Get or create city (using city name as key within region)
    const cityKey = `${zone.region}/${zone.city}`;
    let city = cityMap.get(cityKey);
    if (!city) {
      city = {
        type: "city",
        id: zone.city === "roma" ? 6737 : 0,
        name: zone.city,
        listingCount: 0,
        children: [],
      };
      cityMap.set(cityKey, city);
      region.children.push(city);
    }

    // Get or create z2 (macrozone)
    const z2Id = zone.immobiliareZ2;
    if (z2Id) {
      const z2Key = `${cityKey}/${z2Id}`;
      let z2 = z2Map.get(z2Key);
      if (!z2) {
        z2 = {
          type: "z2",
          z2: z2Id,
          name: getZ2Name(z2Id) || `Macrozone ${z2Id}`,
          listingCount: 0,
          children: [],
        };
        z2Map.set(z2Key, z2);
        city.children.push(z2);
      }

      // Add z3 (microzone) if exists
      if (zone.immobiliareZ3) {
        z2.children.push({
          type: "z3",
          id: zone.id,
          name: zone.name,
          slug: zone.slug,
          z3: zone.immobiliareZ3,
          listingCount: zone.listingCount,
        });
        z2.listingCount += zone.listingCount;
      } else {
        // Zone is z2-only (no z3), add listing count directly to z2
        z2.listingCount += zone.listingCount;
      }

      city.listingCount += zone.listingCount;
      region.listingCount += zone.listingCount;
    }
  }

  // Sort children by name
  tree.sort((a, b) => a.name.localeCompare(b.name));
  for (const region of tree) {
    region.children.sort((a, b) => a.name.localeCompare(b.name));
    for (const city of region.children) {
      city.children.sort((a, b) => a.name.localeCompare(b.name));
      for (const z2 of city.children) {
        z2.children.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  }

  return Response.json({
    tree,
    stats: {
      totalListings: zonesWithCounts.reduce((sum, z) => sum + z.listingCount, 0),
      totalZones: zones.length,
      zonesWithData: zonesWithCounts.filter((z) => z.listingCount > 0).length,
    },
  }, { headers: CACHE_HEADERS });
}
