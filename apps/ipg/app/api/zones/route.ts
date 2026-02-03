import { LocalDB, type Zone } from "@ipg/db";
import { resolve } from "path";
import { getZ2Name } from "@/lib/immobiliare";

const DATA_DIR = resolve(process.cwd(), "../../data");
const db = new LocalDB({ dataDir: DATA_DIR });

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  const zones = await db.getZones();

  const zonesWithCoords = zones.filter(
    (z): z is Zone & { coordinates: { lat: number; lng: number } } =>
      !!z.coordinates &&
      typeof z.coordinates.lat === "number" &&
      typeof z.coordinates.lng === "number"
  );

  const zonesWithCounts = await Promise.all(
    zonesWithCoords.map(async (zone) => {
      const listingCount = await db.getListingCount(zone.id);
      return {
        id: zone.id,
        name: zone.name,
        slug: zone.slug,
        area: zone.area,
        lat: zone.coordinates.lat,
        lng: zone.coordinates.lng,
        listingCount,
        macrozone: getZ2Name(zone.immobiliareZ2),
      };
    })
  );

  return Response.json(zonesWithCounts, { headers: CACHE_HEADERS });
}
