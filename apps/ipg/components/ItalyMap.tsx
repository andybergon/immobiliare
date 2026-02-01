"use client";

import Link from "next/link";

const REGIONS = [
  { id: "lazio", name: "Lazio", path: "M 250 280 L 280 260 L 310 280 L 300 320 L 260 310 Z" },
  { id: "toscana", name: "Toscana", path: "M 200 200 L 260 180 L 280 220 L 250 260 L 200 240 Z" },
  { id: "lombardia", name: "Lombardia", path: "M 180 100 L 250 80 L 280 120 L 240 150 L 180 130 Z" },
  { id: "emilia-romagna", name: "Emilia-Romagna", path: "M 200 150 L 300 140 L 310 180 L 260 190 L 200 180 Z" },
  { id: "veneto", name: "Veneto", path: "M 280 100 L 340 90 L 350 140 L 300 150 L 280 130 Z" },
  { id: "piemonte", name: "Piemonte", path: "M 100 100 L 180 80 L 190 140 L 150 160 L 100 140 Z" },
  { id: "campania", name: "Campania", path: "M 300 320 L 340 300 L 360 340 L 330 370 L 290 350 Z" },
  { id: "sicilia", name: "Sicilia", path: "M 280 450 L 360 430 L 380 470 L 320 500 L 270 480 Z" },
  { id: "sardegna", name: "Sardegna", path: "M 120 320 L 170 300 L 180 380 L 140 410 L 110 370 Z" },
  { id: "puglia", name: "Puglia", path: "M 360 300 L 420 280 L 450 340 L 400 380 L 350 340 Z" },
  { id: "calabria", name: "Calabria", path: "M 360 380 L 390 360 L 400 420 L 370 450 L 350 410 Z" },
];

interface ItalyMapProps {
  selectedRegion?: string;
}

export function ItalyMap({ selectedRegion }: ItalyMapProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <svg viewBox="50 50 450 500" className="w-full h-auto">
        {REGIONS.map((region) => (
          <Link key={region.id} href={`/${region.id}`}>
            <path
              d={region.path}
              className={`
                cursor-pointer transition-all duration-200
                ${selectedRegion === region.id
                  ? "fill-emerald-500 stroke-emerald-700"
                  : "fill-slate-600 hover:fill-emerald-400 stroke-slate-500"
                }
              `}
              strokeWidth="2"
            />
            <title>{region.name}</title>
          </Link>
        ))}
      </svg>
      <p className="text-center text-slate-400 mt-4">Clicca su una regione per iniziare</p>
    </div>
  );
}
