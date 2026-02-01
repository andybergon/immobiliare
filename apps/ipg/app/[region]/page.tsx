import Link from "next/link";
import { LocalDB, type Zone } from "@ipg/db";
import { ZoneSelector } from "@/components/ZoneSelector";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { resolve } from "path";

const DATA_DIR = resolve(process.cwd(), "../../data");

async function getZones(region: string): Promise<Zone[]> {
  const db = new LocalDB({ dataDir: DATA_DIR });
  return db.getZones(region);
}

const REGION_NAMES: Record<string, string> = {
  lazio: "Lazio",
  toscana: "Toscana",
  lombardia: "Lombardia",
  veneto: "Veneto",
  piemonte: "Piemonte",
  campania: "Campania",
  sicilia: "Sicilia",
};

interface PageProps {
  params: Promise<{ region: string }>;
}

export default async function RegionPage({ params }: PageProps) {
  const { region } = await params;
  const zones = await getZones(region);
  const regionName = REGION_NAMES[region] || region;

  if (zones.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <Breadcrumbs items={[{ label: regionName }]} />
        <h1 className="text-3xl font-bold mb-4 mt-4">{regionName}</h1>
        <p className="text-slate-300 mb-8">Questa regione non è ancora disponibile.</p>
        <Link
          href="/"
          className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Torna alla home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: regionName }]} />

        <h1 className="text-4xl font-bold mb-2 mt-4">{regionName}</h1>
        <p className="text-slate-300 mb-8">Seleziona una zona per iniziare a giocare</p>

        <ZoneSelector zones={zones} region={region} />
      </div>
    </main>
  );
}
