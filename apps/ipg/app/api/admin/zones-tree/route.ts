import { LocalDB } from "@ipg/db";
import { resolve } from "path";
import { readFileSync } from "fs";

const DATA_DIR = resolve(process.cwd(), "../../data");
const ZONES_FILE = resolve(DATA_DIR, "zones.json");
const db = new LocalDB({ dataDir: DATA_DIR });

interface ZoneConfig {
  id: string;
  name: string;
  slug: string;
  area: string;
  city: string;
  region: string;
  immobiliareZ2?: number;
  immobiliareZ3?: number;
}

interface ZonesFile {
  version: number;
  updatedAt: string;
  zones: ZoneConfig[];
}

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

// Macrozone names from immobiliare.it
const Z2_NAMES: Record<number, string> = {
  10145: "Prati, Borgo, Mazzini, Delle Vittorie, Degli Eroi",
  10146: "Parioli, Flaminio",
  10147: "Salario, Trieste",
  10148: "Bologna, Policlinico",
  10149: "Termini, Repubblica",
  10150: "Pigneto, San Lorenzo, Casal Bertone",
  10151: "Re di Roma, San Giovanni",
  10152: "Appio Latino, Colli Albani",
  10153: "Garbatella, Navigatori, Ostiense",
  10154: "Marconi, San Paolo",
  10156: "Testaccio, Trastevere",
  10159: "Corso Francia, Vigna Clara, Fleming, Ponte Milvio",
  10161: "Talenti, Monte Sacro, Nuovo Salario",
  10162: "Porta di Roma, Casal Boccone",
  10163: "Monti Tiburtini, Pietralata",
  10164: "Centocelle, Tor de' Schiavi",
  10167: "Appia Pignatelli, Ardeatino, Montagnola",
  10169: "Eur, Torrino, Tintoretto",
  10172: "Aurelio, Boccea",
  10173: "Battistini, Torrevecchia",
  10176: "Bufalotta, Casal Monastero, Settebagni",
  10177: "Ponte di Nona, Torre Angela",
  10180: "Acilia, Casal Bernocchi, Centro Giano, Dragona, Malafede, Vitinia",
  10181: "Lido di Ostia, Ostia Antica, Castel Fusano",
  10259: "Axa, Casal Palocco, Infernetto",
  10281: "Balduina, Medaglie d'Oro",
  10283: "Cinecittà, Quadraro",
  10302: "Trionfale, Monte Mario, Ottavia",
  10303: "Centro Storico",
  10304: "Monteverde, Gianicolense, Colli Portuensi, Casaletto",
  10307: "Castel di Leva, Vallerano, Fonte Laurentina",
};

function loadZones(): ZoneConfig[] {
  const content = readFileSync(ZONES_FILE, "utf-8");
  const config: ZonesFile = JSON.parse(content);
  return config.zones;
}

export async function GET() {
  const zones = loadZones();

  // Get listing counts for each zone
  const zonesWithCounts = await Promise.all(
    zones.map(async (zone) => {
      const listings = await db.getListings(zone.id);
      return { ...zone, listingCount: listings.length };
    })
  );

  // Build tree: region > city > z2 > z3
  const tree: RegionNode[] = [];
  const regionMap = new Map<string, RegionNode>();
  const cityMap = new Map<string, CityNode>();
  const z2Map = new Map<number, Z2Node>();

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
        id: 6737, // Roma city ID
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
      let z2 = z2Map.get(z2Id);
      if (!z2) {
        z2 = {
          type: "z2",
          z2: z2Id,
          name: Z2_NAMES[z2Id] || `Macrozone ${z2Id}`,
          listingCount: 0,
          children: [],
        };
        z2Map.set(z2Id, z2);
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
  });
}
