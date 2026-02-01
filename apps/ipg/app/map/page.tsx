"use client";

import dynamic from "next/dynamic";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const ZoneMap = dynamic(() => import("@/components/ZoneMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-slate-700 rounded-lg flex items-center justify-center">
      <p className="text-slate-400">Caricamento mappa...</p>
    </div>
  ),
});

export default function MapPage() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl w-full">
        <div className="mb-6">
          <Breadcrumbs items={[{ label: "Mappa" }]} />
          <h1 className="text-3xl font-bold mt-4">Zone di Roma</h1>
        </div>

        <p className="text-slate-300 mb-6">
          Clicca su una zona per iniziare a giocare. Le zone colorate hanno annunci disponibili.
        </p>

        <ZoneMap />

        <div className="mt-6 text-sm text-slate-400">
          <p>Dati da immobiliare.it</p>
        </div>
      </div>
    </main>
  );
}
