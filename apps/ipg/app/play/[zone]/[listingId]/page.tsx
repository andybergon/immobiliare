import { LocalDB, type Listing, type Zone } from "@ipg/db";
import { GameClient } from "./game-client";
import Link from "next/link";
import { resolve } from "path";

const DATA_DIR = resolve(process.cwd(), "../../data");

async function getZoneBySlug(slug: string): Promise<Zone | null> {
  const db = new LocalDB({ dataDir: DATA_DIR });
  const zones = await db.getZones();
  return zones.find((z) => z.slug === slug) || null;
}

async function getListingById(zoneId: string, listingId: string): Promise<Listing | null> {
  const db = new LocalDB({ dataDir: DATA_DIR });
  const listings = await db.getListings(zoneId, { playableOnly: true });
  return listings.find((l) => l.sourceId === listingId) || null;
}

async function getListingContext(
  zoneId: string,
  currentId: string
): Promise<{ prev: string | null; next: string | null; total: number; current: number }> {
  const db = new LocalDB({ dataDir: DATA_DIR });
  const listings = await db.getListings(zoneId, { playableOnly: true });
  const currentIndex = listings.findIndex((l) => l.sourceId === currentId);

  if (currentIndex === -1) {
    return { prev: null, next: null, total: listings.length, current: 0 };
  }

  const prevListing = currentIndex > 0 ? listings[currentIndex - 1] : listings[listings.length - 1];
  const nextListing = currentIndex < listings.length - 1 ? listings[currentIndex + 1] : listings[0];

  return {
    prev: prevListing?.sourceId || null,
    next: nextListing?.sourceId || null,
    total: listings.length,
    current: currentIndex + 1,
  };
}

interface PageProps {
  params: Promise<{ zone: string; listingId: string }>;
}

export default async function PlayListingPage({ params }: PageProps) {
  const { zone: zoneSlug, listingId } = await params;
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

  const listing = await getListingById(zone.id, listingId);

  if (!listing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Annuncio non trovato</h1>
        <p className="text-slate-300 mb-8">L&apos;annuncio richiesto non esiste.</p>
        <Link
          href={`/play/${zoneSlug}`}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Vai a un annuncio casuale
        </Link>
      </main>
    );
  }

  const { prev, next, total, current } = await getListingContext(zone.id, listingId);

  return <GameClient zone={zone} listing={listing} prevId={prev} nextId={next} total={total} current={current} />;
}
