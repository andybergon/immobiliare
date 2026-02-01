"use client";

import type { Listing } from "@ipg/db";
import { ImageCarousel } from "./ImageCarousel";

interface PropertyCardProps {
  listing: Listing;
  showPrice?: boolean;
}

export function PropertyCard({ listing, showPrice = false }: PropertyCardProps) {
  return (
    <div className="bg-slate-700 rounded-lg overflow-hidden">
      <ImageCarousel images={listing.images} title={listing.title} />

      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{listing.title}</h2>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={-1}
            className="text-slate-400 hover:text-emerald-400 text-sm whitespace-nowrap flex items-center gap-1 shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 3L2 12h3v9h6v-6h2v6h6v-9h3L12 3z" />
            </svg>
            <span>immobiliare.it</span>
            <span>↗</span>
          </a>
        </div>

        {listing.location.address && (
          <div className="flex items-center gap-2 text-slate-300">
            <span>📍</span>
            <span>{listing.location.address}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-slate-300">
          {listing.features.area && (
            <div className="flex items-center gap-1 bg-slate-600 px-3 py-1 rounded-full">
              <span>📐</span>
              <span>{listing.features.area} m²</span>
            </div>
          )}
          {listing.features.rooms && (
            <div className="flex items-center gap-1 bg-slate-600 px-3 py-1 rounded-full">
              <span>🚪</span>
              <span>{listing.features.rooms} locali</span>
            </div>
          )}
          {listing.features.bathrooms && (
            <div className="flex items-center gap-1 bg-slate-600 px-3 py-1 rounded-full">
              <span>🚿</span>
              <span>{listing.features.bathrooms} bagni</span>
            </div>
          )}
          {listing.features.floor !== null && (
            <div className="flex items-center gap-1 bg-slate-600 px-3 py-1 rounded-full">
              <span>🏢</span>
              <span>Piano {listing.features.floor}</span>
            </div>
          )}
          {listing.features.elevator && (
            <div className="flex items-center gap-1 bg-slate-600 px-3 py-1 rounded-full">
              <span>🛗</span>
              <span>Ascensore</span>
            </div>
          )}
          {listing.features.energyClass && (
            <div className="flex items-center gap-1 bg-slate-600 px-3 py-1 rounded-full">
              <span>⚡</span>
              <span>Classe {listing.features.energyClass}</span>
            </div>
          )}
        </div>

        {showPrice && (
          <div className="pt-4 border-t border-slate-600">
            <p className="text-3xl font-bold text-emerald-400">{listing.priceFormatted}</p>
          </div>
        )}
      </div>
    </div>
  );
}
