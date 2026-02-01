"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Listing, Zone } from "@ipg/db";
import { PropertyCard } from "@/components/PropertyCard";
import { PriceGuessForm } from "@/components/PriceGuessForm";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { KeyboardHint } from "@/components/KeyboardHint";

interface GameClientProps {
  zone: Zone;
  listing: Listing;
  prevId: string | null;
  nextId: string | null;
  total: number;
  current: number;
}

export function GameClient({ zone, listing, prevId, nextId, total, current }: GameClientProps) {
  const router = useRouter();
  const [guess, setGuess] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleGuess = (value: number) => {
    setGuess(value);
    setRevealed(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft" && prevId) {
        e.preventDefault();
        router.push(`/play/${zone.slug}/${prevId}`);
      } else if (e.altKey && e.key === "ArrowRight" && nextId) {
        e.preventDefault();
        router.push(`/play/${zone.slug}/${nextId}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, zone.slug, prevId, nextId]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Breadcrumbs
            items={[
              { label: "Mappa", href: "/map" },
              { label: zone.name },
            ]}
          />
          <span className="text-slate-400 text-sm">
            {current} / {total}
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">
          {revealed ? "Risultato" : "Indovina il prezzo"}
        </h1>

        <div className="mb-6">
          <PropertyCard listing={listing} showPrice={revealed} />

          {(prevId || nextId) && (
            <div className="flex justify-center gap-4 mt-3">
              {prevId ? (
                <Link
                  href={`/play/${zone.slug}/${prevId}`}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  title="Alt + ←"
                >
                  <span>← Precedente</span>
                  <KeyboardHint keys="Alt ←" className="hidden sm:inline" />
                </Link>
              ) : (
                <span />
              )}
              {nextId && (
                <Link
                  href={`/play/${zone.slug}/${nextId}`}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  title="Alt + →"
                >
                  <KeyboardHint keys="Alt →" className="hidden sm:inline" />
                  <span>Successivo →</span>
                </Link>
              )}
            </div>
          )}
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
              {nextId && (
                <Link
                  href={`/play/${zone.slug}/${nextId}`}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
                >
                  Prossimo →
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
