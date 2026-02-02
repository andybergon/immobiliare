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
  coordinates: { lat: number; lng: number };
  immobiliareZ2?: number;
  immobiliareZ3?: number;
}

interface ZonesFile {
  version: number;
  updatedAt: string;
  zones: ZoneConfig[];
}

function loadZones(): ZoneConfig[] {
  const content = readFileSync(ZONES_FILE, "utf-8");
  const config: ZonesFile = JSON.parse(content);
  return config.zones;
}

export async function GET() {
  const zones = loadZones();

  const zonesWithCounts = await Promise.all(
    zones.map(async (zone) => {
      const listings = await db.getListings(zone.id);
      return {
        id: zone.id,
        name: zone.name,
        slug: zone.slug,
        area: zone.area,
        lat: zone.coordinates.lat,
        lng: zone.coordinates.lng,
        listingCount: listings.length,
        z2: zone.immobiliareZ2,
        z3: zone.immobiliareZ3,
      };
    })
  );

  return Response.json(zonesWithCounts);
}
