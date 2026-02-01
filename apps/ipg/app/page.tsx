import Link from "next/link";
import { ItalyMap } from "@/components/ItalyMap";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold mb-4">🏠 Il Prezzo Giusto</h1>
        <p className="text-xl text-slate-300 mb-8">
          Riesci a indovinare il prezzo degli immobili in Italia?
        </p>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Seleziona una regione</h2>
          <ItalyMap />
        </div>

        <div className="text-slate-400 text-sm">
          <p>Attualmente disponibile: Lazio (Roma)</p>
        </div>
      </div>
    </main>
  );
}
