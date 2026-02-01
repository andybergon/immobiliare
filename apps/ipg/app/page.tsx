import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold mb-4">🏠 Il Prezzo Giusto</h1>
        <p className="text-xl text-slate-300 mb-8">
          Riesci a indovinare il prezzo degli immobili a Roma?
        </p>

        <h2 className="text-2xl font-semibold mb-6">Scegli come giocare</h2>

        <div className="grid gap-4 max-w-md mx-auto">
          <Link
            href="/map"
            className="block p-6 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🗺️</span>
              <div>
                <h3 className="text-xl font-bold">Mappa</h3>
                <p className="text-blue-200 text-sm">
                  Scegli un quartiere dalla mappa di Roma
                </p>
              </div>
            </div>
            <span className="inline-block mt-2 text-xs bg-blue-500 px-2 py-1 rounded">
              Consigliato
            </span>
          </Link>

          <Link
            href="/play/axa"
            className="block p-6 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🎮</span>
              <div>
                <h3 className="text-xl font-bold">Arcade</h3>
                <p className="text-slate-300 text-sm">
                  Quartiere casuale, inizia subito
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
