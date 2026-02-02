import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold mb-4">🏠 Il Prezzo Giusto</h1>
        <p className="text-xl text-slate-300 mb-8">
          Riesci a indovinare il prezzo degli immobili a Roma?
        </p>

        <h2 className="text-2xl font-semibold mb-8">Scegli come giocare</h2>

        <div className="grid gap-6 max-w-lg mx-auto">
          <Link
            href="/map"
            className="block p-8 bg-blue-600 rounded-2xl hover:bg-blue-700 hover:scale-[1.02] transition-all text-center"
          >
            <span className="text-6xl block mb-4">🗺️</span>
            <h3 className="text-2xl font-bold mb-2">Mappa</h3>
            <p className="text-blue-200">
              Scegli un quartiere dalla mappa di Roma
            </p>
          </Link>

          <Link
            href="/play/axa"
            className="block p-8 bg-slate-700 rounded-2xl hover:bg-slate-600 hover:scale-[1.02] transition-all text-center"
          >
            <span className="text-6xl block mb-4">🎲</span>
            <h3 className="text-2xl font-bold mb-2">Casuale</h3>
            <p className="text-slate-300">
              Quartiere casuale, inizia subito
            </p>
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <Link
            href="/admin"
            className="fixed bottom-4 right-4 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            Admin
          </Link>
        )}
      </div>
    </main>
  );
}
