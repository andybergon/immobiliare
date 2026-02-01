import { LocalDB, type Zone } from "@ipg/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolve } from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = resolve(process.cwd(), "../../data");

async function getZoneBySlug(slug: string): Promise<Zone | null> {
  const db = new LocalDB({ dataDir: DATA_DIR });
  const zones = await db.getZones();
  return zones.find((z) => z.slug === slug) || null;
}

async function getRandomListingId(zoneId: string): Promise<string | null> {
  const db = new LocalDB({ dataDir: DATA_DIR });
  const listing = await db.getRandomListing(zoneId);
  return listing?.sourceId || null;
}

interface PageProps {
  params: Promise<{ zone: string }>;
}

export default async function PlayZonePage({ params }: PageProps) {
  const { zone: zoneSlug } = await params;
  const zone = await getZoneBySlug(zoneSlug);

  if (!zone) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Zona non trovata</h1>
        <p className="text-slate-300 mb-8">La zona richiesta non esiste.</p>
        <Link
          href="/"
          className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ← Torna alla mappa
        </Link>
      </main>
    );
  }

  const listingId = await getRandomListingId(zone.id);

  if (!listingId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">{zone.name}</h1>
        <p className="text-slate-300 mb-8">Nessun annuncio disponibile per questa zona.</p>
        <Link
          href={`/${zone.region}`}
          className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ← Torna alle zone
        </Link>
      </main>
    );
  }

  redirect(`/play/${zoneSlug}/${listingId}`);
}
