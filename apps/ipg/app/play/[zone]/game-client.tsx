"use client";

import { useState } from "react";
import Link from "next/link";
import type { Listing, Zone } from "@ipg/db";
import { PropertyCard } from "@/components/PropertyCard";
import { PriceGuessForm } from "@/components/PriceGuessForm";
import { ScoreDisplay } from "@/components/ScoreDisplay";

interface GameClientProps {
  zone: Zone;
  listing: Listing;
}

export function GameClient({ zone, listing }: GameClientProps) {
  const [guess, setGuess] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleGuess = (value: number) => {
    setGuess(value);
    setRevealed(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/${zone.region}`} className="text-slate-400 hover:text-white">
            ← {zone.name}
          </Link>
          <span className="text-slate-500 text-sm">
            {zone.city.charAt(0).toUpperCase() + zone.city.slice(1)}
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">
          {revealed ? "Risultato" : "Indovina il prezzo"}
        </h1>

        <div className="mb-6">
          <PropertyCard listing={listing} showPrice={revealed} />
        </div>

        {!revealed ? (
          <PriceGuessForm onSubmit={handleGuess} />
        ) : (
          <>
            {guess !== null && (
              <ScoreDisplay guess={guess} actual={listing.price} />
            )}

            <div className="flex gap-4 mt-6">
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Vedi annuncio
              </a>
              <Link
                href={`/play/${zone.slug}`}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Prossimo →
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
