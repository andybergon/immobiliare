"use client";

interface ScoreDisplayProps {
  guess: number;
  actual: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

function calculateScore(guess: number, actual: number): { score: number; percentOff: number; message: string } {
  const diff = Math.abs(guess - actual);
  const percentOff = (diff / actual) * 100;

  if (percentOff <= 5) return { score: 100, percentOff, message: "Perfetto! 🎯" };
  if (percentOff <= 10) return { score: 80, percentOff, message: "Ottimo! 🌟" };
  if (percentOff <= 15) return { score: 60, percentOff, message: "Bene! 👍" };
  if (percentOff <= 25) return { score: 40, percentOff, message: "Non male 🤔" };
  if (percentOff <= 40) return { score: 20, percentOff, message: "Ci sei quasi 😅" };
  return { score: 0, percentOff, message: "Riprova! 💪" };
}

export function ScoreDisplay({ guess, actual }: ScoreDisplayProps) {
  const { score, percentOff, message } = calculateScore(guess, actual);
  const isOver = guess > actual;

  return (
    <div className="space-y-6">
      <div className="bg-slate-700 rounded-lg p-6 text-center">
        <p className="text-slate-400 mb-2">Il prezzo reale è</p>
        <p className="text-4xl font-bold text-emerald-400">{formatPrice(actual)}</p>
      </div>

      <div className="bg-slate-700 rounded-lg p-6 text-center">
        <p className="text-slate-400 mb-2">La tua stima</p>
        <p className="text-2xl font-semibold">{formatPrice(guess)}</p>
        <p className="text-slate-400 mt-2">
          {isOver ? "↑" : "↓"} {percentOff.toFixed(1)}% {isOver ? "sopra" : "sotto"}
        </p>
      </div>

      <div className="bg-slate-700 rounded-lg p-6 text-center">
        <p className="text-6xl mb-2">{message}</p>
        <p className="text-slate-400">Punteggio</p>
        <p className="text-5xl font-bold">{score}</p>
      </div>
    </div>
  );
}
