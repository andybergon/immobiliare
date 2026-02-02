import { LocalDB } from "@ipg/db";
import { resolve } from "path";
import { readFileSync } from "fs";

const DATA_DIR = resolve(process.cwd(), "../../data");
const ZONES_FILE = resolve(DATA_DIR, "zones.json");
const db = new LocalDB({ dataDir: DATA_DIR });

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
        macrozone: zone.immobiliareZ2 ? Z2_NAMES[zone.immobiliareZ2] : undefined,
      };
    })
  );

  return Response.json(zonesWithCounts);
}
