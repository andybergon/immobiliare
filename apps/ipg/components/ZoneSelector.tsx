"use client";

import Link from "next/link";
import type { Zone } from "@ipg/db";

interface ZoneSelectorProps {
  zones: Zone[];
  region: string;
}

export function ZoneSelector({ zones, region }: ZoneSelectorProps) {
  const groupedByCity = zones.reduce((acc, zone) => {
    const city = zone.city.charAt(0).toUpperCase() + zone.city.slice(1);
    if (!acc[city]) acc[city] = [];
    acc[city].push(zone);
    return acc;
  }, {} as Record<string, Zone[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedByCity).map(([city, cityZones]) => (
        <div key={city}>
          <h2 className="text-2xl font-semibold mb-4">{city}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {cityZones.map((zone) => (
              <Link
                key={zone.id}
                href={`/play/${zone.slug}`}
                className="bg-slate-700 hover:bg-slate-600 rounded-lg p-4 text-center transition-colors"
              >
                <span className="text-lg font-medium">{zone.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
